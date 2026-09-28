import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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
import { SessionsService } from '../src/modules/sessions/sessions.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { CryptoService } from '../src/common/services/crypto.service';
import { EventsGateway } from '../src/modules/events/events.gateway';
import { TableStatus, SessionStatus, generateSignedQrToken } from '@chai-partner/shared';

describe('Table Claim Race & Single Active Session Rule (BRAIN Rule 5)', () => {
  let dataSource: DataSource;
  let sessionsService: SessionsService;
  let table: TableEntity;

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
      jwt: { secret: 'test_secret' },
    });

    const cryptoService = new CryptoService(configService);
    const jwtService = new JwtService({ secret: 'test_jwt_secret' });

    // Mock EventsGateway
    const eventsGateway = {
      emitTableStatusChanged: jest.fn(),
      emitOrderStatusChanged: jest.fn(),
      emitNewOrder: jest.fn(),
      emitOrderUpdated: jest.fn(),
      emitAdminAlert: jest.fn(),
    } as unknown as EventsGateway;

    const auditService = new AuditService(dataSource.getRepository(AuditLogEntity));

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
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.synchronize(true); // reset tables
    const tableRepo = dataSource.getRepository(TableEntity);
    table = await tableRepo.save(
      tableRepo.create({
        table_number: 1,
        seat_count: 4,
        status: TableStatus.AVAILABLE,
        qr_token: generateSignedQrToken(1, 'chai_partner_qr_signing_secret_min_32_characters_long'),
      }),
    );
  });

  it('allows single customer to claim available table', async () => {
    const res = await sessionsService.verifyOtpAndCreateSession({
      table_id: table.id,
      phone: '9876543210',
      otp: '123456',
      name: 'Rohan Sharma',
    });

    expect(res.session_token).toBeDefined();
    expect(res.session.customer_name).toBe('Rohan Sharma');
    expect(res.table.status).toBe(TableStatus.OCCUPIED);

    const updatedTable = await dataSource.getRepository(TableEntity).findOne({ where: { id: table.id } });
    expect(updatedTable?.status).toBe(TableStatus.OCCUPIED);
    expect(updatedTable?.current_session_id).toBe(res.session.id);
  });

  it('prevents table-claim race condition when two customers scan the same table simultaneously', async () => {
    // Two simultaneous claim attempts
    const customer1 = sessionsService.verifyOtpAndCreateSession({
      table_id: table.id,
      phone: '9876543210',
      otp: '123456',
      name: 'Customer 1',
    });

    const customer2 = sessionsService.verifyOtpAndCreateSession({
      table_id: table.id,
      phone: '9123456789',
      otp: '123456',
      name: 'Customer 2',
    });

    const results = await Promise.allSettled([customer1, customer2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly ONE customer must succeed
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Database must only have ONE active session for this table
    const activeSessions = await dataSource.getRepository(SessionEntity).find({
      where: { table_id: table.id, status: SessionStatus.ACTIVE },
    });
    expect(activeSessions.length).toBe(1);

    // The table must be occupied by that single session
    const updatedTable = await dataSource.getRepository(TableEntity).findOne({ where: { id: table.id } });
    expect(updatedTable?.status).toBe(TableStatus.OCCUPIED);
  });
});
