import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { RefundEntity } from '../../database/entities/refund.entity';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { OrderEntity } from '../../database/entities/order.entity';
import { TableEntity } from '../../database/entities/table.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import {
  OrderStatus,
  PaymentStatus,
  TableStatus,
  SessionStatus,
} from '@chai-partner/shared';

export interface ProcessRefundDto {
  amount: number;
  reason: string;
}

@Injectable()
export class RefundsService {
  constructor(
    @InjectRepository(RefundEntity)
    private refundRepo: Repository<RefundEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(OrderEntity)
    private orderRepo: Repository<OrderEntity>,
    @InjectRepository(TableEntity)
    private tableRepo: Repository<TableEntity>,
    private dataSource: DataSource,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * BRAIN Rule 7: Every refund is logged before an order can be marked cancelled.
   */
  async processRefundAndCancelOrder(
    orderId: string,
    dto: ProcessRefundDto,
    processedBy: string,
  ): Promise<{ refund: RefundEntity; order: OrderEntity }> {
    if (!dto.reason || dto.reason.trim().length < 3) {
      throw new BadRequestException('A valid reason is mandatory for processing a cancellation and refund');
    }

    if (!dto.amount || dto.amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['table', 'session'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('This order is already cancelled');
    }

    if (dto.amount > Number(order.total)) {
      throw new BadRequestException(
        `Refund amount (₹${dto.amount}) cannot exceed the order total (₹${order.total})`,
      );
    }

    let payment = await this.paymentRepo.findOne({ where: { order_id: order.id } });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Ensure payment record exists
      if (!payment) {
        payment = queryRunner.manager.create(PaymentEntity, {
          order_id: order.id,
          amount: order.total,
          status: PaymentStatus.PENDING,
        });
        payment = await queryRunner.manager.save(PaymentEntity, payment);
      }

      // 2. BRAIN Rule 7: Create Refund record FIRST
      const refund = queryRunner.manager.create(RefundEntity, {
        payment_id: payment.id,
        amount: dto.amount,
        reason: dto.reason.trim(),
        processed_by: processedBy,
        timestamp: new Date(),
      });
      const savedRefund = await queryRunner.manager.save(RefundEntity, refund);

      // 3. Update payment status to REFUNDED
      payment.status = PaymentStatus.REFUNDED;
      await queryRunner.manager.save(PaymentEntity, payment);

      // 4. Update order status to CANCELLED and payment_status to REFUNDED
      order.status = OrderStatus.CANCELLED;
      order.payment_status = PaymentStatus.REFUNDED;
      const savedOrder = await queryRunner.manager.save(OrderEntity, order);

      // 5. Check if table can be freed (if no other active/unbilled orders remain)
      const remainingActive = await queryRunner.manager.count(OrderEntity, {
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

      if (remainingActive === 0) {
        await queryRunner.manager.update(
          SessionEntity,
          { id: order.session_id },
          { status: SessionStatus.CLOSED },
        );
        await queryRunner.manager.update(
          TableEntity,
          { id: order.table_id },
          { status: TableStatus.AVAILABLE, current_session_id: null },
        );
        this.eventsGateway.emitTableStatusChanged(order.table_id, TableStatus.AVAILABLE);
      }

      await queryRunner.commitTransaction();

      // 6. Immutable audit log (BRAIN Rule 9)
      await this.auditService.log({
        actor_id: processedBy,
        actor_type: 'admin',
        action: 'ORDER_CANCELLED_WITH_REFUND',
        entity: 'orders',
        entity_id: order.id,
        metadata: {
          order_number: order.order_number,
          refund_amount: dto.amount,
          refund_reason: dto.reason.trim(),
          payment_id: payment.id,
          processed_by: processedBy,
          table_freed: remainingActive === 0,
        },
      });

      // Socket notification
      this.eventsGateway.emitOrderStatusChanged(order.id, OrderStatus.CANCELLED, order.session_id);
      this.eventsGateway.emitOrderUpdated(order.id, {
        status: OrderStatus.CANCELLED,
        payment_status: PaymentStatus.REFUNDED,
      });

      return { refund: savedRefund, order: savedOrder };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getRefundsByOrderId(orderId: string): Promise<RefundEntity[]> {
    const payment = await this.paymentRepo.findOne({ where: { order_id: orderId } });
    if (!payment) return [];
    return this.refundRepo.find({ where: { payment_id: payment.id } });
  }
}
