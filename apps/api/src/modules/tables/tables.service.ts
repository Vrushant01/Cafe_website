import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TableEntity } from '../../database/entities/table.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { OrderEntity } from '../../database/entities/order.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import {
  TableStatus,
  SessionStatus,
  OrderStatus,
  PaymentStatus,
  ResolveTableResponse,
} from '@chai-partner/shared';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(TableEntity)
    private tableRepo: Repository<TableEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepo: Repository<SessionEntity>,
    @InjectRepository(OrderEntity)
    private orderRepo: Repository<OrderEntity>,
    private cryptoService: CryptoService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
  ) {}

  async getAllTables(): Promise<any[]> {
    const tables = await this.tableRepo.find({ order: { table_number: 'ASC' } });
    
    // Fetch associated sessions to determine if they are EXITED
    const sessions = await this.sessionRepo.find({
      where: {
        id: In(tables.map(t => t.current_session_id).filter(Boolean)),
      },
    });

    const sessionMap = new Map(sessions.map(s => [s.id, s]));

    return tables.map(t => ({
      ...t,
      current_session: t.current_session_id ? sessionMap.get(t.current_session_id) : null,
    }));
  }

  async resolveToken(token: string): Promise<ResolveTableResponse> {
    const verified = this.cryptoService.verifyQrToken(token);
    if (!verified.valid || !verified.tableNumber) {
      throw new NotFoundException('Invalid or tampered QR code token');
    }

    const table = await this.tableRepo.findOne({
      where: { table_number: verified.tableNumber },
    });

    if (!table) {
      throw new NotFoundException(`Table ${verified.tableNumber} does not exist`);
    }

    const allTables = await this.getAllTables();

    // Check if there is an active session
    let activeSession = null;
    if (table.status === TableStatus.OCCUPIED) {
      const session = await this.sessionRepo.findOne({
        where: [
          { table_id: table.id, status: SessionStatus.ACTIVE },
          { table_id: table.id, status: SessionStatus.EXITED }
        ],
        order: { started_at: 'DESC' },
      });
      if (session) {
        activeSession = {
          id: session.id,
          customer_name: session.customer_name,
          expires_at: session.expires_at.toISOString(),
          status: session.status,
          rejoin_expires_at: session.rejoin_expires_at?.toISOString() || null
        };
      }
    }

    return {
      table: {
        id: table.id,
        table_number: table.table_number,
        seat_count: table.seat_count,
        status: table.status,
      },
      all_tables: allTables.map((t) => ({
        id: t.id,
        table_number: t.table_number,
        seat_count: t.seat_count,
        status: t.status,
      })),
      active_session: activeSession,
    };
  }

  async forceVacate(
    tableId: string,
    reason: string,
    adminId: string,
    adminName: string,
  ): Promise<TableEntity> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Mandatory reason must be provided for Force Vacate');
    }

    const table = await this.tableRepo.findOne({ where: { id: tableId } });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // 1. Close any active or open sessions for this table
    const tableSessions = await this.sessionRepo.find({
      where: { table_id: tableId },
    });

    const sessionIds = tableSessions.map((s) => s.id);
    for (const session of tableSessions) {
      if (session.status === SessionStatus.ACTIVE) {
        session.status = SessionStatus.CLOSED;
        await this.sessionRepo.save(session);
      }
    }

    // 2. Finalize and remove all active orders for this table
    // (Orders that are in PLACED, ACCEPTED, PREPARING, READY, SERVED)
    const activeOrderStatuses = [
      OrderStatus.PLACED,
      OrderStatus.ACCEPTED,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.SERVED,
    ];

    let activeOrders: OrderEntity[] = [];
    if (sessionIds.length > 0) {
      activeOrders = await this.orderRepo.find({
        where: [
          { table_id: tableId, status: In(activeOrderStatuses) },
          { session_id: In(sessionIds), status: In(activeOrderStatuses) },
        ],
      });
    } else {
      activeOrders = await this.orderRepo.find({
        where: { table_id: tableId, status: In(activeOrderStatuses) },
      });
    }

    const vacatedOrderNumbers: string[] = [];
    for (const order of activeOrders) {
      // If order was already served or already paid, archive as BILLED. Otherwise, mark CANCELLED.
      const newStatus =
        order.status === OrderStatus.SERVED || order.payment_status === PaymentStatus.PAID
          ? OrderStatus.BILLED
          : OrderStatus.CANCELLED;

      order.status = newStatus;
      await this.orderRepo.save(order);
      vacatedOrderNumbers.push(order.order_number);

      // Real-time broadcast so order disappears from live queue on all screens and customer track page updates
      this.eventsGateway.emitOrderStatusChanged(order.id, newStatus, order.session_id);
      this.eventsGateway.emitOrderUpdated(order.id, { status: newStatus });
    }

    // 3. Mark table available and clear current_session_id
    const previousStatus = table.status;
    table.status = TableStatus.AVAILABLE;
    table.current_session_id = null;
    const updated = await this.tableRepo.save(table);

    // 4. Audit Log (BRAIN Rule 9)
    await this.auditService.log({
      actor_id: adminId,
      actor_type: 'admin',
      action: 'TABLE_FORCE_VACATE',
      entity: 'tables',
      entity_id: tableId,
      metadata: {
        table_number: table.table_number,
        reason,
        admin_name: adminName,
        previous_status: previousStatus,
        closed_session_ids: sessionIds,
        vacated_order_ids: activeOrders.map((o) => o.id),
        vacated_order_numbers: vacatedOrderNumbers,
      },
    });

    // 5. Emit table status changed via WebSocket
    this.eventsGateway.emitTableStatusChanged(table.id, TableStatus.AVAILABLE);

    return updated;
  }

  async contactManager(tableNumber: number, message?: string) {
    this.eventsGateway.emitAdminAlert({
      type: 'MANAGER_CONTACT_REQUEST',
      title: `Table ${tableNumber} assistance requested`,
      message: message || `Customer at Table ${tableNumber} reports occupancy conflict or needs assistance.`,
      tableNumber,
    });
    return { success: true, message: 'Manager notified' };
  }
}
