import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  TableEntity,
  SessionEntity,
  MenuCategoryEntity,
  MenuItemEntity,
  OrderEntity,
  OrderItemEntity,
  PaymentEntity,
  RefundEntity,
  AdminUserEntity,
  AuditLogEntity,
  IdempotencyKeyEntity,
} from '../src/database/entities';
import { SessionSweeperService } from '../src/modules/sessions/session-sweeper.service';
import { SessionsService } from '../src/modules/sessions/sessions.service';
import { ReconciliationService } from '../src/modules/orders/reconciliation.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { CryptoService } from '../src/common/services/crypto.service';
import { EventsGateway } from '../src/modules/events/events.gateway';
import {
  TableStatus,
  SessionStatus,
  OrderStatus,
  PaymentStatus,
  generateSignedQrToken,
} from '@chai-partner/shared';

describe('Phase 3: Session & Table Hardening (Ghost Sweeper, Rate Limits, Auto-Extend, Reconciliation)', () => {
  let dataSource: DataSource;
  let sweeperService: SessionSweeperService;
  let sessionsService: SessionsService;
  let reconciliationService: ReconciliationService;
  let auditService: AuditService;
  let cryptoService: CryptoService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [
        TableEntity,
        SessionEntity,
        MenuCategoryEntity,
        MenuItemEntity,
        OrderEntity,
        OrderItemEntity,
        PaymentEntity,
        RefundEntity,
        AdminUserEntity,
        AuditLogEntity,
        IdempotencyKeyEntity,
      ],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();

    const configService = new ConfigService({
      crypto: {
        phoneEncryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        qrHmacSecret: 'chai_partner_qr_signing_secret_min_32_characters_long',
      },
      jwt: { secret: 'test_jwt_phase3' },
    });

    cryptoService = new CryptoService(configService);
    const jwtService = new JwtService({ secret: 'test_jwt_phase3' });

    const eventsGateway = {
      emitTableStatusChanged: jest.fn(),
      emitOrderStatusChanged: jest.fn(),
      emitNewOrder: jest.fn(),
      emitOrderUpdated: jest.fn(),
      emitAdminAlert: jest.fn(),
      server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    } as unknown as EventsGateway;

    auditService = new AuditService(dataSource.getRepository(AuditLogEntity));

    sweeperService = new SessionSweeperService(
      dataSource.getRepository(SessionEntity),
      dataSource.getRepository(TableEntity),
      dataSource.getRepository(OrderEntity),
      dataSource,
      auditService,
      eventsGateway,
    );

    sessionsService = new SessionsService(
      dataSource.getRepository(SessionEntity),
      dataSource.getRepository(TableEntity),
      dataSource,
      jwtService,
      cryptoService,
      configService,
      auditService,
      eventsGateway,
    );

    reconciliationService = new ReconciliationService(
      dataSource.getRepository(OrderEntity),
      cryptoService,
      auditService,
    );
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  describe('Ghost-Session Sweeper (BRAIN Rule 6)', () => {
    it('Case A: Frees table when an expired session has ZERO orders placed', async () => {
      const tableRepo = dataSource.getRepository(TableEntity);
      const sessionRepo = dataSource.getRepository(SessionEntity);

      const table1 = await tableRepo.save(
        tableRepo.create({
          table_number: 1,
          seat_count: 2,
          status: TableStatus.OCCUPIED,
          qr_token: generateSignedQrToken(1, 'secret'),
        }),
      );

      // Session started 2.5 hours ago and expired 30 minutes ago
      const expiredAt = new Date(Date.now() - 30 * 60 * 1000);
      const startedAt = new Date(Date.now() - 2.5 * 60 * 60 * 1000);

      const ghostSession = await sessionRepo.save(
        sessionRepo.create({
          table_id: table1.id,
          customer_name: 'Ghost Customer',
          phone: cryptoService.encrypt('9999900001'),
          started_at: startedAt,
          expires_at: expiredAt,
          status: SessionStatus.ACTIVE,
        }),
      );

      table1.current_session_id = ghostSession.id;
      await tableRepo.save(table1);

      // Run ghost sweeper
      const sweepResult = await sweeperService.sweepExpiredSessions();
      expect(sweepResult.sweptGhostSessions).toBe(1);

      // Table 1 MUST BE FREED (status = AVAILABLE, current_session_id = null)
      const updatedTable = await tableRepo.findOne({ where: { id: table1.id } });
      expect(updatedTable?.status).toBe(TableStatus.AVAILABLE);
      expect(updatedTable?.current_session_id).toBeNull();

      // Session status must be EXPIRED
      const updatedSession = await sessionRepo.findOne({ where: { id: ghostSession.id } });
      expect(updatedSession?.status).toBe(SessionStatus.EXPIRED);

      // Audit trail must be recorded
      const logs = await dataSource.getRepository(AuditLogEntity).find();
      expect(logs.some((l) => l.action === 'GHOST_SESSION_SWEPT')).toBe(true);
    });

    it('Case B: Retains table as OCCUPIED when an expired session has an unbilled order (BRAIN Rule 6)', async () => {
      const tableRepo = dataSource.getRepository(TableEntity);
      const sessionRepo = dataSource.getRepository(SessionEntity);
      const orderRepo = dataSource.getRepository(OrderEntity);

      const table2 = await tableRepo.save(
        tableRepo.create({
          table_number: 2,
          seat_count: 4,
          status: TableStatus.OCCUPIED,
          qr_token: generateSignedQrToken(2, 'secret'),
        }),
      );

      const expiredAt = new Date(Date.now() - 15 * 60 * 1000);
      const startedAt = new Date(Date.now() - 2.25 * 60 * 60 * 1000);

      const sessionWithOrder = await sessionRepo.save(
        sessionRepo.create({
          table_id: table2.id,
          customer_name: 'Dining Guest',
          phone: cryptoService.encrypt('9999900002'),
          started_at: startedAt,
          expires_at: expiredAt,
          status: SessionStatus.ACTIVE,
        }),
      );

      table2.current_session_id = sessionWithOrder.id;
      await tableRepo.save(table2);

      // Create an unbilled order for this session
      await orderRepo.save(
        orderRepo.create({
          session_id: sessionWithOrder.id,
          table_id: table2.id,
          order_number: 'CP-1099',
          status: OrderStatus.SERVED, // Food served but not yet settled/billed
          payment_status: PaymentStatus.PENDING,
          subtotal: 200,
          tax: 10,
          total: 210,
        }),
      );

      // Run ghost sweeper
      const sweepResult = await sweeperService.sweepExpiredSessions();
      expect(sweepResult.retainedUnbilledSessions).toBe(1);

      // BRAIN Rule 6: Table 2 MUST REMAIN OCCUPIED!
      const updatedTable = await tableRepo.findOne({ where: { id: table2.id } });
      expect(updatedTable?.status).toBe(TableStatus.OCCUPIED);
      expect(updatedTable?.current_session_id).toBe(sessionWithOrder.id);

      // Audit trail must be recorded
      const logs = await dataSource.getRepository(AuditLogEntity).find();
      expect(logs.some((l) => l.action === 'EXPIRED_SESSION_TABLE_RETAINED')).toBe(true);
    });
  });

  describe('Session Auto-Extend on Customer Activity', () => {
    it('auto-extends session by 30 mins when customer interacts within 15 mins of expiry', async () => {
      const tableRepo = dataSource.getRepository(TableEntity);
      const sessionRepo = dataSource.getRepository(SessionEntity);

      const table = await tableRepo.save(
        tableRepo.create({
          table_number: 3,
          seat_count: 2,
          status: TableStatus.OCCUPIED,
          qr_token: generateSignedQrToken(3, 'secret'),
        }),
      );

      // Session expiring in 8 minutes (within 15 min window)
      const nearExpiry = new Date(Date.now() + 8 * 60 * 1000);
      const session = await sessionRepo.save(
        sessionRepo.create({
          table_id: table.id,
          customer_name: 'Active Browsing Guest',
          phone: cryptoService.encrypt('9999900003'),
          started_at: new Date(Date.now() - 112 * 60 * 1000),
          expires_at: nearExpiry,
          status: SessionStatus.ACTIVE,
        }),
      );

      const extendResult = await sessionsService.autoExtendSession(session.id, 30);
      expect(extendResult.extended).toBe(true);

      const updatedSession = await sessionRepo.findOne({ where: { id: session.id } });
      expect(new Date(updatedSession!.expires_at).getTime()).toBeGreaterThan(nearExpiry.getTime());
    });
  });

  describe('OTP Rate Limiting & Lockout', () => {
    it('enforces 60-second cooldown between OTP requests', async () => {
      const table = await dataSource.getRepository(TableEntity).save(
        dataSource.getRepository(TableEntity).create({
          table_number: 4,
          seat_count: 2,
          status: TableStatus.AVAILABLE,
          qr_token: generateSignedQrToken(4, 'secret'),
        }),
      );

      // First request succeeds
      await sessionsService.requestOtp({
        table_id: table.id,
        phone: '9888877771',
        name: 'Tester Cooldown',
      });

      // Immediate second request fails with cooldown error
      await expect(
        sessionsService.requestOtp({
          table_id: table.id,
          phone: '9888877771',
          name: 'Tester Cooldown',
        }),
      ).rejects.toThrow('Please wait');
    });

    it('locks out phone for 15 minutes after 3 consecutive wrong OTP attempts', async () => {
      const table = await dataSource.getRepository(TableEntity).save(
        dataSource.getRepository(TableEntity).create({
          table_number: 6,
          seat_count: 2,
          status: TableStatus.AVAILABLE,
          qr_token: generateSignedQrToken(6, 'secret'),
        }),
      );

      const phone = '9777766662';
      await sessionsService.requestOtp({
        table_id: table.id,
        phone,
        name: 'Brute Force Tester',
      });

      // Attempt 1: wrong OTP
      await expect(
        sessionsService.verifyOtpAndCreateSession({
          table_id: table.id,
          phone,
          otp: '000000',
          name: 'Brute Force Tester',
        }),
      ).rejects.toThrow('Invalid OTP. 2 attempt(s) remaining.');

      // Attempt 2: wrong OTP
      await expect(
        sessionsService.verifyOtpAndCreateSession({
          table_id: table.id,
          phone,
          otp: '111111',
          name: 'Brute Force Tester',
        }),
      ).rejects.toThrow('Invalid OTP. 1 attempt(s) remaining.');

      // Attempt 3: wrong OTP -> Lockout triggered!
      await expect(
        sessionsService.verifyOtpAndCreateSession({
          table_id: table.id,
          phone,
          otp: '222222',
          name: 'Brute Force Tester',
        }),
      ).rejects.toThrow('Account locked for 15 minutes');
    });
  });

  describe('Daily Pending-Payment Reconciliation Report', () => {
    it('compiles pending payments older than threshold into audit report', async () => {
      const tableRepo = dataSource.getRepository(TableEntity);
      const sessionRepo = dataSource.getRepository(SessionEntity);
      const orderRepo = dataSource.getRepository(OrderEntity);

      const table = await tableRepo.save(
        tableRepo.create({
          table_number: 7,
          seat_count: 4,
          status: TableStatus.OCCUPIED,
          qr_token: generateSignedQrToken(7, 'secret'),
        }),
      );

      const session = await sessionRepo.save(
        sessionRepo.create({
          table_id: table.id,
          customer_name: 'Unreconciled Guest',
          phone: cryptoService.encrypt('9812345678'),
          started_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
          expires_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: SessionStatus.ACTIVE,
        }),
      );

      // Order created 3 hours ago with status PENDING
      await orderRepo.save(
        orderRepo.create({
          session_id: session.id,
          table_id: table.id,
          order_number: 'CP-1077',
          status: OrderStatus.SERVED,
          payment_status: PaymentStatus.PENDING,
          subtotal: 350,
          tax: 17.5,
          total: 367.5,
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000),
        }),
      );

      const report = await reconciliationService.generatePendingPaymentReport(2);
      expect(report.total_pending_orders).toBe(1);
      expect(report.total_uncollected_amount).toBe(367.5);
      expect(report.orders[0].order_number).toBe('CP-1077');
      expect(report.orders[0].phone_masked).toBe('+91 ******5678');
      expect(report.orders[0].table_number).toBe(7);

      const logs = await dataSource.getRepository(AuditLogEntity).find();
      expect(logs.some((l) => l.action === 'RECONCILIATION_REPORT_GENERATED')).toBe(true);
    });
  });
});
