import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
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
    const tables = await this.tableRepo.find({ 
      where: { is_deleted: false },
      order: { table_number: 'ASC' } 
    });

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

  /** Return only active (non-archived) tables for admin management. */
  async getActiveTables(includeDisabled = true): Promise<any[]> {
    const all = await this.getAllTables();
    return includeDisabled ? all.filter(t => t.is_active !== false) : all.filter(t => t.is_active);
  }

  async getTableById(id: string): Promise<TableEntity> {
    const table = await this.tableRepo.findOne({ where: { id } });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  async resolveToken(token: string): Promise<ResolveTableResponse> {
    const verified = this.cryptoService.verifyQrToken(token);
    if (!verified.valid || !verified.tableNumber) {
      throw new NotFoundException('Invalid or tampered QR code token');
    }

    const table = await this.tableRepo.findOne({
      where: { table_number: verified.tableNumber, is_deleted: false },
    });

    if (!table) {
      throw new NotFoundException(`Table ${verified.tableNumber} does not exist`);
    }

    // Disabled table check
    if (table.is_active === false) {
      throw new ForbiddenException(
        `Table ${verified.tableNumber} is currently unavailable. Please choose another table or contact staff.`,
      );
    }

    const allTables = await this.getAllTables();

    let activeSession = null;
    if (table.status === TableStatus.OCCUPIED) {
      const session = await this.sessionRepo.findOne({
        where: [
          { table_id: table.id, status: SessionStatus.ACTIVE },
          { table_id: table.id, status: SessionStatus.EXITED },
        ],
        order: { started_at: 'DESC' },
      });
      if (session) {
        activeSession = {
          id: session.id,
          customer_name: session.customer_name,
          expires_at: session.expires_at.toISOString(),
          status: session.status,
          rejoin_expires_at: session.rejoin_expires_at?.toISOString() || null,
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
      all_tables: allTables.map(t => ({
        id: t.id,
        table_number: t.table_number,
        seat_count: t.seat_count,
        status: t.status,
      })),
      active_session: activeSession,
    };
  }

  // ----------------------------------------------------------------
  // OWNER-ONLY CRUD
  // ----------------------------------------------------------------

  async createTable(
    tableNumber: number,
    seatCount: number = 4,
    adminId: string,
    adminName: string,
  ): Promise<TableEntity> {
    if (!tableNumber || tableNumber < 1) {
      throw new BadRequestException('Table number must be a positive integer');
    }
    if (seatCount < 1) {
      throw new BadRequestException('Seat count must be a positive integer');
    }

    const existing = await this.tableRepo.findOne({ where: { table_number: tableNumber, is_deleted: false } });
    if (existing) {
      throw new ConflictException(`Table number ${tableNumber} already exists`);
    }

    const qrToken = this.cryptoService.generateQrToken(tableNumber);

    const table = this.tableRepo.create({
      table_number: tableNumber,
      seat_count: seatCount,
      status: TableStatus.AVAILABLE,
      qr_token: qrToken,
      is_active: true,
      qr_version: 1,
    });

    const saved = await this.tableRepo.save(table);

    await this.auditService.log({
      actor_id: adminId,
      actor_type: 'admin',
      action: 'TABLE_CREATED',
      entity: 'tables',
      entity_id: saved.id,
      metadata: { table_number: tableNumber, seat_count: seatCount, admin_name: adminName },
    });

    this.eventsGateway.emitTableStatusChanged(saved.id, TableStatus.AVAILABLE);

    return saved;
  }

  async updateTable(
    id: string,
    updates: { table_number?: number; seat_count?: number },
    adminId: string,
    adminName: string,
  ): Promise<TableEntity> {
    const table = await this.getTableById(id);

    if (updates.table_number !== undefined && updates.table_number !== table.table_number) {
      if (updates.table_number < 1) {
        throw new BadRequestException('Table number must be a positive integer');
      }
      const conflict = await this.tableRepo.findOne({
        where: { table_number: updates.table_number, is_deleted: false, id: Not(id) },
      });
      if (conflict) {
        throw new ConflictException(`Table number ${updates.table_number} is already in use`);
      }
      // Regenerate QR for new number
      table.qr_token = this.cryptoService.generateQrToken(updates.table_number);
      table.qr_version = (table.qr_version || 1) + 1;
      table.table_number = updates.table_number;
    }

    if (updates.seat_count !== undefined) {
      if (updates.seat_count < 1) throw new BadRequestException('Seat count must be a positive integer');
      table.seat_count = updates.seat_count;
    }

    const saved = await this.tableRepo.save(table);

    await this.auditService.log({
      actor_id: adminId,
      actor_type: 'admin',
      action: 'TABLE_UPDATED',
      entity: 'tables',
      entity_id: id,
      metadata: { updates, admin_name: adminName, table_number: saved.table_number },
    });

    return saved;
  }

  async archiveTable(id: string, adminId: string, adminName: string): Promise<{ success: boolean }> {
    const table = await this.getTableById(id);

    // Cannot delete occupied/active table
    if (table.status === TableStatus.OCCUPIED) {
      throw new BadRequestException(
        'This table currently has an active dining session and cannot be deleted.',
      );
    }

    // Soft-delete completely
    table.is_active = false;
    table.is_deleted = true;
    
    // Modify unique fields so a new table with the same number can be created
    table.table_number = -Math.floor(Date.now() / 1000) - table.table_number;
    table.qr_token = `deleted_${table.id}_${table.qr_token}`;

    await this.tableRepo.save(table);

    await this.auditService.log({
      actor_id: adminId,
      actor_type: 'admin',
      action: 'TABLE_ARCHIVED',
      entity: 'tables',
      entity_id: id,
      metadata: { table_number: table.table_number, admin_name: adminName },
    });

    return { success: true };
  }

  async disableTable(id: string, reason: string | undefined, adminId: string, adminName: string): Promise<TableEntity> {
    const table = await this.getTableById(id);
    table.is_active = false;
    const saved = await this.tableRepo.save(table);

    await this.auditService.log({
      actor_id: adminId,
      actor_type: 'admin',
      action: 'TABLE_DISABLED',
      entity: 'tables',
      entity_id: id,
      metadata: { table_number: table.table_number, reason: reason || 'No reason given', admin_name: adminName },
    });

    this.eventsGateway.emitTableStatusChanged(id, table.status);
    return saved;
  }

  async enableTable(id: string, adminId: string, adminName: string): Promise<TableEntity> {
    const table = await this.getTableById(id);
    table.is_active = true;
    const saved = await this.tableRepo.save(table);

    await this.auditService.log({
      actor_id: adminId,
      actor_type: 'admin',
      action: 'TABLE_ENABLED',
      entity: 'tables',
      entity_id: id,
      metadata: { table_number: table.table_number, admin_name: adminName },
    });

    this.eventsGateway.emitTableStatusChanged(id, table.status);
    return saved;
  }

  async regenerateQr(id: string, adminId: string, adminName: string): Promise<TableEntity> {
    const table = await this.getTableById(id);

    const newVersion = (table.qr_version || 1) + 1;
    // Incorporate version into token to ensure it's always different from prior token
    const newQrToken = this.cryptoService.generateQrToken(table.table_number, newVersion);
    table.qr_token = newQrToken;
    table.qr_version = newVersion;

    const saved = await this.tableRepo.save(table);

    await this.auditService.log({
      actor_id: adminId,
      actor_type: 'admin',
      action: 'QR_REGENERATED',
      entity: 'tables',
      entity_id: id,
      metadata: { table_number: table.table_number, new_qr_version: saved.qr_version, admin_name: adminName },
    });

    return saved;
  }

  // ----------------------------------------------------------------
  // FORCE VACATE (existing)
  // ----------------------------------------------------------------

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

    const tableSessions = await this.sessionRepo.find({
      where: { table_id: tableId },
    });

    const sessionIds = tableSessions.map(s => s.id);
    for (const session of tableSessions) {
      if (session.status === SessionStatus.ACTIVE) {
        session.status = SessionStatus.CLOSED;
        await this.sessionRepo.save(session);
      }
    }

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
      const newStatus =
        order.status === OrderStatus.SERVED || order.payment_status === PaymentStatus.PAID
          ? OrderStatus.BILLED
          : OrderStatus.CANCELLED;

      order.status = newStatus;
      await this.orderRepo.save(order);
      vacatedOrderNumbers.push(order.order_number);

      this.eventsGateway.emitOrderStatusChanged(order.id, newStatus, order.session_id);
      this.eventsGateway.emitOrderUpdated(order.id, { status: newStatus });
    }

    const previousStatus = table.status;
    table.status = TableStatus.AVAILABLE;
    table.current_session_id = null;
    const updated = await this.tableRepo.save(table);

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
        vacated_order_ids: activeOrders.map(o => o.id),
        vacated_order_numbers: vacatedOrderNumbers,
      },
    });

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
