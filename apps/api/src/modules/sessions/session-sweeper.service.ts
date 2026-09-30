import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, DataSource } from 'typeorm';
import { SessionEntity } from '../../database/entities/session.entity';
import { TableEntity } from '../../database/entities/table.entity';
import { OrderEntity } from '../../database/entities/order.entity';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import {
  TableStatus,
  SessionStatus,
  OrderStatus,
  PaymentStatus,
  EXPIRY_WARNING_THRESHOLD_MS,
} from '@chai-partner/shared';

export interface SweepResult {
  sweptGhostSessions: number;
  retainedUnbilledSessions: number;
  expiringSoonWarnings: number;
}

@Injectable()
export class SessionSweeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionSweeperService.name);
  private sweepInterval?: NodeJS.Timeout;

  onModuleInit() {
    // Run automated ghost session sweep every 60 seconds (non-blocking)
    this.sweepInterval = setInterval(() => {
      this.sweepExpiredSessions().catch((err) =>
        this.logger.error('Background session sweep failed:', err),
      );
    }, 60000);
  }

  onModuleDestroy() {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
    }
  }

  constructor(
    @InjectRepository(SessionEntity)
    private sessionRepo: Repository<SessionEntity>,
    @InjectRepository(TableEntity)
    private tableRepo: Repository<TableEntity>,
    @InjectRepository(OrderEntity)
    private orderRepo: Repository<OrderEntity>,
    private dataSource: DataSource,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * BRAIN Rule 6: Ghost Session Sweeper
   * - If 0 orders placed: table is freed, session closed.
   * - If unbilled order exists: table STAYS OCCUPIED, session marked expired.
   */
  async sweepExpiredSessions(now: Date = new Date()): Promise<SweepResult> {
    const expiredSessions = await this.sessionRepo.find({
      where: {
        status: SessionStatus.ACTIVE,
        expires_at: LessThan(now),
      },
      relations: ['table'],
    });

    const exitTimedOutSessions = await this.sessionRepo.find({
      where: {
        status: SessionStatus.EXITED,
        rejoin_expires_at: LessThan(now),
      },
      relations: ['table'],
    });

    let sweptGhostSessions = 0;
    let retainedUnbilledSessions = 0;

    for (const session of expiredSessions) {
      // Count all orders placed during this session
      const orderCount = await this.orderRepo.count({
        where: { session_id: session.id },
      });

      // Count unbilled orders
      const unbilledOrderCount = await this.orderRepo.count({
        where: {
          session_id: session.id,
          status: In([
            OrderStatus.PLACED,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
          ]),
        },
      });

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        if (orderCount === 0) {
          // CASE A: GHOST SESSION (0 orders ever placed)
          // Table becomes available per BRAIN Rule 6(a)
          session.status = SessionStatus.EXPIRED;
          await queryRunner.manager.save(SessionEntity, session);

          await queryRunner.manager.update(
            TableEntity,
            { id: session.table_id },
            { status: TableStatus.AVAILABLE, current_session_id: null },
          );

          await queryRunner.commitTransaction();

          sweptGhostSessions++;

          // Broadcast to client and admin
          this.eventsGateway.emitTableStatusChanged(session.table_id, TableStatus.AVAILABLE);

          // Audit log (BRAIN Rule 9)
          await this.auditService.log({
            actor_id: 'ghost-sweeper',
            actor_type: 'system',
            action: 'GHOST_SESSION_SWEPT',
            entity: 'sessions',
            entity_id: session.id,
            metadata: {
              table_id: session.table_id,
              table_number: session.table?.table_number,
              customer_name: session.customer_name,
              reason: 'Expired 2hr session with zero orders placed. Table freed automatically.',
            },
          });

          this.logger.log(
            `[Ghost Sweeper] Table ${session.table?.table_number} freed (0 orders). Session ${session.id} expired.`,
          );
        } else {
          // CASE B: UNBILLED ORDER EXISTS
          // BRAIN Rule 6: Table STAYS OCCUPIED. Never auto-freed!
          session.status = SessionStatus.EXPIRED;
          await queryRunner.manager.save(SessionEntity, session);

          // Crucial: We do NOT set table status to available! It stays occupied!
          await queryRunner.commitTransaction();

          retainedUnbilledSessions++;

          await this.auditService.log({
            actor_id: 'ghost-sweeper',
            actor_type: 'system',
            action: 'EXPIRED_SESSION_TABLE_RETAINED',
            entity: 'sessions',
            entity_id: session.id,
            metadata: {
              table_id: session.table_id,
              table_number: session.table?.table_number,
              unbilled_orders: unbilledOrderCount,
              reason: 'Session expired but unbilled orders exist. Table remains occupied until settlement or force vacate.',
            },
          });

          this.eventsGateway.emitAdminAlert({
            type: 'TABLE_OCCUPIED_UNBILLED_WARNING',
            title: `Table ${session.table?.table_number} Unbilled Order Warning`,
            message: `Customer session has reached 2 hours with unbilled orders. Table remains occupied.`,
            tableNumber: session.table?.table_number,
          });

          this.logger.warn(
            `[Ghost Sweeper] Table ${session.table?.table_number} retained occupied (${unbilledOrderCount} unbilled orders).`,
          );
        }
      } catch (err) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`Failed to process expired session ${session.id}:`, err);
      } finally {
        await queryRunner.release();
      }
    }

    // --- SWEEP EXITED TIMEOUTS ---
    for (const session of exitTimedOutSessions) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      try {
        session.status = SessionStatus.EXPIRED;
        session.closed_at = now;
        session.completion_reason = 'EXIT_TIMEOUT';
        await queryRunner.manager.save(SessionEntity, session);

        await queryRunner.manager.update(
          TableEntity,
          { id: session.table_id },
          { status: TableStatus.AVAILABLE, current_session_id: null },
        );

        await queryRunner.commitTransaction();

        sweptGhostSessions++;

        this.eventsGateway.emitTableStatusChanged(session.table_id, TableStatus.AVAILABLE);

        this.eventsGateway.emitAdminAlert({
          type: 'EXIT_TIMEOUT',
          title: `Table ${session.table?.table_number} is now available`,
          message: `Customer did not rejoin within 2 minutes. Session closed.`,
          tableNumber: session.table?.table_number,
        });

        await this.auditService.log({
          actor_id: 'exit-sweeper',
          actor_type: 'system',
          action: 'EXIT_TIMEOUT_SWEPT',
          entity: 'sessions',
          entity_id: session.id,
          metadata: {
            table_id: session.table_id,
            table_number: session.table?.table_number,
            customer_name: session.customer_name,
            reason: '2-minute rejoin window expired.',
          },
        });
        
        this.logger.log(`[Exit Sweeper] Session ${session.id} timed out. Table ${session.table?.table_number} freed.`);
      } catch (err) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`[Exit Sweeper] Error sweeping session ${session.id}:`, err);
      } finally {
        await queryRunner.release();
      }
    }

    // Check for sessions expiring soon (within 10 minutes)
    const expiringSoonWarnings = await this.checkExpiringSoonSessions(now);

    return {
      sweptGhostSessions,
      retainedUnbilledSessions,
      expiringSoonWarnings,
    };
  }

  /**
   * Broadcasts 10-minute warning to customer app
   */
  async checkExpiringSoonSessions(now: Date = new Date()): Promise<number> {
    const warningWindow = new Date(now.getTime() + EXPIRY_WARNING_THRESHOLD_MS);

    const nearExpirySessions = await this.sessionRepo.find({
      where: {
        status: SessionStatus.ACTIVE,
      },
    });

    let warningCount = 0;
    for (const session of nearExpirySessions) {
      const remainingMs = new Date(session.expires_at).getTime() - now.getTime();
      if (remainingMs > 0 && remainingMs <= EXPIRY_WARNING_THRESHOLD_MS) {
        const minutesRemaining = Math.ceil(remainingMs / 60000);
        this.eventsGateway.server
          ?.to(`session_${session.id}`)
          ?.emit('session:expiring_soon', {
            sessionId: session.id,
            minutesRemaining,
          });
        warningCount++;
      }
    }
    return warningCount;
  }
}
