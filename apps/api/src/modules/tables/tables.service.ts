import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableEntity } from '../../database/entities/table.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import { TableStatus, SessionStatus, ResolveTableResponse } from '@chai-partner/shared';

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(TableEntity)
    private tableRepo: Repository<TableEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepo: Repository<SessionEntity>,
    private cryptoService: CryptoService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
  ) {}

  async getAllTables(): Promise<TableEntity[]> {
    return this.tableRepo.find({ order: { table_number: 'ASC' } });
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
        where: { table_id: table.id, status: SessionStatus.ACTIVE },
        order: { started_at: 'DESC' },
      });
      if (session) {
        activeSession = {
          id: session.id,
          customer_name: session.customer_name,
          expires_at: session.expires_at.toISOString(),
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

    // Close any active session
    const activeSessions = await this.sessionRepo.find({
      where: { table_id: tableId, status: SessionStatus.ACTIVE },
    });

    for (const session of activeSessions) {
      session.status = SessionStatus.CLOSED;
      await this.sessionRepo.save(session);
    }

    const previousStatus = table.status;
    table.status = TableStatus.AVAILABLE;
    table.current_session_id = null;
    const updated = await this.tableRepo.save(table);

    // BRAIN Rule 9: All admin state-changing actions write to audit_log
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
        closed_session_ids: activeSessions.map((s) => s.id),
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
