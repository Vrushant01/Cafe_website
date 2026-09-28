import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { OrderEntity } from '../../database/entities/order.entity';
import { OrderItemEntity } from '../../database/entities/order-item.entity';
import { MenuItemEntity } from '../../database/entities/menu-item.entity';
import { TableEntity } from '../../database/entities/table.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { IdempotencyKeyEntity } from '../../database/entities/idempotency-key.entity';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  TableStatus,
  SessionStatus,
  CreateOrderDto,
  calculateOrderTotals,
} from '@chai-partner/shared';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(MenuItemEntity)
    private menuItemRepo: Repository<MenuItemEntity>,
    @InjectRepository(TableEntity)
    private tableRepo: Repository<TableEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepo: Repository<SessionEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(IdempotencyKeyEntity)
    private idempotencyRepo: Repository<IdempotencyKeyEntity>,
    private dataSource: DataSource,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Place an order with mandatory Idempotency-Key (BRAIN Rule 4)
   * Snapshots unit_price immutably (BRAIN Rule 2)
   */
  async placeOrder(
    sessionId: string,
    dto: CreateOrderDto,
    idempotencyKey?: string,
  ): Promise<OrderEntity> {
    // 1. BRAIN Rule 4: Mandatory Idempotency-Key
    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key header is required for all order placement');
    }

    const cleanKey = idempotencyKey.trim();

    // Check if idempotency key was already processed for this session
    const existingKeyRecord = await this.idempotencyRepo.findOne({
      where: { session_id: sessionId, key: cleanKey },
    });

    if (existingKeyRecord) {
      console.log(`[Idempotency] Returning cached response for key ${cleanKey}`);
      return existingKeyRecord.response_snapshot as OrderEntity;
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // 2. Validate Session & Table
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['table'],
    });

    if (!session || session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Active session required to place order');
    }

    // 3. Fetch Menu Items to Snapshot Prices (BRAIN Rule 2)
    const itemIds = dto.items.map((i) => i.menu_item_id);
    const menuItems = await this.menuItemRepo.find({
      where: { id: In(itemIds) },
    });

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Check items availability
    for (const itemDto of dto.items) {
      const found = menuItemMap.get(itemDto.menu_item_id);
      if (!found) {
        throw new NotFoundException(`Menu item ${itemDto.menu_item_id} not found`);
      }
      if (!found.is_available) {
        throw new BadRequestException(`"${found.name}" is currently unavailable`);
      }
      if (itemDto.qty <= 0) {
        throw new BadRequestException(`Invalid quantity for "${found.name}"`);
      }
    }

    // 4. Calculate Totals with GST Line
    const itemsWithPrices = dto.items.map((i) => {
      const menuItem = menuItemMap.get(i.menu_item_id)!;
      return {
        menu_item_id: menuItem.id,
        qty: i.qty,
        unit_price: Number(menuItem.price), // SNAPSHOT AT PLACEMENT TIME
        item_name: menuItem.name,
        veg_flag: menuItem.veg_flag,
      };
    });

    const { subtotal, tax, total } = calculateOrderTotals(itemsWithPrices);

    // 5. Transactional Order Creation
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate sequential order number CP-XXXX
      const count = await queryRunner.manager.count(OrderEntity);
      const orderNumber = `CP-${1001 + count}`;

      const order = queryRunner.manager.create(OrderEntity, {
        session_id: session.id,
        table_id: session.table_id,
        order_number: orderNumber,
        status: OrderStatus.PLACED,
        payment_status:
          dto.payment_method === PaymentMethod.RAZORPAY
            ? PaymentStatus.PENDING
            : PaymentStatus.PENDING, // For cash it is pending settlement at counter
        subtotal,
        tax,
        total,
        notes: dto.notes ? dto.notes.trim() : null,
      });

      const savedOrder = await queryRunner.manager.save(OrderEntity, order);

      // Create snapshot order items
      const orderItemsToSave = itemsWithPrices.map((item) =>
        queryRunner.manager.create(OrderItemEntity, {
          order_id: savedOrder.id,
          menu_item_id: item.menu_item_id,
          qty: item.qty,
          unit_price: item.unit_price,
          item_name: item.item_name,
          veg_flag: item.veg_flag,
        }),
      );

      savedOrder.items = await queryRunner.manager.save(OrderItemEntity, orderItemsToSave);

      // Create Payment Record
      const payment = queryRunner.manager.create(PaymentEntity, {
        order_id: savedOrder.id,
        method: dto.payment_method || PaymentMethod.CASH,
        amount: total,
        status: PaymentStatus.PENDING,
      });
      await queryRunner.manager.save(PaymentEntity, payment);

      // Save Idempotency Key Snapshot (BRAIN Rule 4)
      const idempotencyEntry = queryRunner.manager.create(IdempotencyKeyEntity, {
        session_id: sessionId,
        key: cleanKey,
        response_snapshot: savedOrder,
      });
      await queryRunner.manager.save(IdempotencyKeyEntity, idempotencyEntry);

      await queryRunner.commitTransaction();

      // Broadcast real-time new order to admin / kitchen dashboard
      const populated = await this.getOrderById(savedOrder.id);
      this.eventsGateway.emitNewOrder(populated);

      return populated;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrderById(id: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items', 'table', 'session'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return order;
  }

  async getLiveQueue(): Promise<OrderEntity[]> {
    // Oldest first per PRD.md §6.2 and TRD.md §5
    return this.orderRepo.find({
      where: {
        status: In([
          OrderStatus.PLACED,
          OrderStatus.ACCEPTED,
          OrderStatus.PREPARING,
          OrderStatus.READY,
          OrderStatus.SERVED,
        ]),
      },
      relations: ['items', 'table', 'session'],
      order: {
        created_at: 'ASC', // Oldest orders first
      },
    });
  }

  /**
   * BRAIN Rule 1: Guarded transactional status update: WHERE status = <expected>
   */
  async transitionStatus(
    orderId: string,
    expectedCurrent: OrderStatus,
    newStatus: OrderStatus,
    adminId: string,
    adminName: string,
  ): Promise<OrderEntity> {
    // Valid lifecycle transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PLACED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
      [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.BILLED],
      [OrderStatus.SERVED]: [OrderStatus.BILLED],
      [OrderStatus.BILLED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.CANCELLATION_REQUESTED]: [OrderStatus.CANCELLED],
    };

    const allowed = validTransitions[expectedCurrent];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Illegal state transition: cannot change order status from "${expectedCurrent}" to "${newStatus}"`,
      );
    }

    // Perform guarded update
    const result = await this.orderRepo.update(
      { id: orderId, status: expectedCurrent },
      { status: newStatus },
    );

    if (result.affected === 0) {
      const current = await this.orderRepo.findOne({ where: { id: orderId } });
      if (!current) {
        throw new NotFoundException('Order not found');
      }
      throw new ConflictException(
        `Guarded transition failed: order is already in "${current.status}" status (expected "${expectedCurrent}"). Action may have already been executed by another staff member.`,
      );
    }

    const updated = await this.getOrderById(orderId);

    // BRAIN Rule 9: Audit log entry
    await this.auditService.log({
      actor_id: adminId,
      actor_type: 'admin',
      action: 'ORDER_STATUS_TRANSITION',
      entity: 'orders',
      entity_id: orderId,
      metadata: {
        order_number: updated.order_number,
        expected_status: expectedCurrent,
        new_status: newStatus,
        admin_name: adminName,
      },
    });

    // Real-time notification to customer tracking and admin queue
    this.eventsGateway.emitOrderStatusChanged(orderId, newStatus, updated.session_id);
    this.eventsGateway.emitOrderUpdated(orderId, { status: newStatus });

    return updated;
  }

  /**
   * Settle Order: marks payment paid, order billed, closes session, and frees table!
   * Enforces BRAIN Rule 6: Table freed on settlement.
   */
  async settleOrder(
    orderId: string,
    settledMethod: PaymentMethod,
    adminId: string,
    adminName: string,
  ): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['table', 'session'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.BILLED) {
      throw new BadRequestException('Order has already been billed');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update order status to BILLED & payment_status to PAID
      order.status = OrderStatus.BILLED;
      order.payment_status = PaymentStatus.PAID;
      await queryRunner.manager.save(OrderEntity, order);

      // 2. Update payment record
      let payment = await queryRunner.manager.findOne(PaymentEntity, {
        where: { order_id: order.id },
      });

      if (payment) {
        payment.status = PaymentStatus.PAID;
        payment.method = settledMethod;
        await queryRunner.manager.save(PaymentEntity, payment);
      } else {
        payment = queryRunner.manager.create(PaymentEntity, {
          order_id: order.id,
          method: settledMethod,
          amount: order.total,
          status: PaymentStatus.PAID,
        });
        await queryRunner.manager.save(PaymentEntity, payment);
      }

      // 3. BRAIN Rule 6: Free the table and close session!
      // Check if there are any other active/unbilled orders for this session
      const remainingUnbilled = await queryRunner.manager.count(OrderEntity, {
        where: {
          session_id: order.session_id,
          status: In([
            OrderStatus.PLACED,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
          ]),
        },
      });

      if (remainingUnbilled === 0) {
        // Close session
        await queryRunner.manager.update(
          SessionEntity,
          { id: order.session_id },
          { status: SessionStatus.CLOSED },
        );

        // Free table
        await queryRunner.manager.update(
          TableEntity,
          { id: order.table_id },
          { status: TableStatus.AVAILABLE, current_session_id: null },
        );

        this.eventsGateway.emitTableStatusChanged(order.table_id, TableStatus.AVAILABLE);
      }

      await queryRunner.commitTransaction();

      // BRAIN Rule 9: Audit log
      await this.auditService.log({
        actor_id: adminId,
        actor_type: 'admin',
        action: 'ORDER_SETTLED_AND_BILLED',
        entity: 'orders',
        entity_id: order.id,
        metadata: {
          order_number: order.order_number,
          total: order.total,
          settled_method: settledMethod,
          admin_name: adminName,
          table_freed: remainingUnbilled === 0,
        },
      });

      this.eventsGateway.emitOrderStatusChanged(order.id, OrderStatus.BILLED, order.session_id);
      this.eventsGateway.emitOrderUpdated(order.id, {
        status: OrderStatus.BILLED,
        payment_status: PaymentStatus.PAID,
      });

      return order;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
