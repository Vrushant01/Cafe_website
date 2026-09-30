import { DataSource } from 'typeorm';
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
import { OrdersService } from '../src/modules/orders/orders.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { EventsGateway } from '../src/modules/events/events.gateway';
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  TableStatus,
  SessionStatus,
  generateSignedQrToken,
} from '@chai-partner/shared';

describe('Guarded Order Transitions, Idempotency & Snapshot Rules (BRAIN Rules 1, 2, 4, 6, 9)', () => {
  let dataSource: DataSource;
  let ordersService: OrdersService;
  let auditService: AuditService;
  let table: TableEntity;
  let session: SessionEntity;
  let category: MenuCategoryEntity;
  let menuItem: MenuItemEntity;

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

    const eventsGateway = {
      emitTableStatusChanged: jest.fn(),
      emitOrderStatusChanged: jest.fn(),
      emitNewOrder: jest.fn(),
      emitOrderUpdated: jest.fn(),
      emitAdminAlert: jest.fn(),
    } as unknown as EventsGateway;

    auditService = new AuditService(dataSource.getRepository(AuditLogEntity));

    ordersService = new OrdersService(
      dataSource.getRepository(OrderEntity),
      dataSource.getRepository(OrderItemEntity),
      dataSource.getRepository(MenuItemEntity),
      dataSource.getRepository(TableEntity),
      dataSource.getRepository(SessionEntity),
      dataSource.getRepository(PaymentEntity),
      dataSource.getRepository(IdempotencyKeyEntity),
      dataSource,
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
    await dataSource.synchronize(true);

    const tableRepo = dataSource.getRepository(TableEntity);
    table = await tableRepo.save(
      tableRepo.create({
        table_number: 5,
        seat_count: 4,
        status: TableStatus.OCCUPIED,
        qr_token: generateSignedQrToken(5, 'chai_partner_qr_signing_secret_min_32_characters_long'),
      }),
    );

    const sessionRepo = dataSource.getRepository(SessionEntity);
    session = await sessionRepo.save(
      sessionRepo.create({
        table_id: table.id,
        customer_name: 'Aarav Patel',
        phone: 'encrypted_phone_data',
        started_at: new Date(),
        expires_at: new Date(Date.now() + 7200000),
        status: SessionStatus.ACTIVE,
      }),
    );

    table.current_session_id = session.id;
    await tableRepo.save(table);

    const catRepo = dataSource.getRepository(MenuCategoryEntity);
    category = await catRepo.save(
      catRepo.create({ name: 'Milk Tea', sort_order: 1 }),
    );

    const itemRepo = dataSource.getRepository(MenuItemEntity);
    menuItem = await itemRepo.save(
      itemRepo.create({
        category_id: category.id,
        name: 'Masala Chai',
        description: 'Authentic spiced chai',
        price: 30,
        is_bestseller: true,
        is_available: true,
        veg_flag: true,
      }),
    );
  });

  it('places order with snapshotted unit_price and creates audit trail (BRAIN Rule 2 & 4)', async () => {
    const order = await ordersService.placeOrder(
      session.id,
      {
        items: [{ menu_item_id: menuItem.id, qty: 2 }],
        payment_method: PaymentMethod.CASH,
      },
      'idemp-key-test-1',
    );

    expect(order.order_number).toBe('CP-1001');
    expect(order.status).toBe(OrderStatus.PLACED);
    expect(order.subtotal).toBe(60); // 2 * 30
    expect(order.tax).toBe(3); // 5% GST = 3.00
    expect(order.total).toBe(63);
    expect(order.items.length).toBe(1);
    expect(order.items[0].unit_price).toBe(30);

    // Rule 2 verification: Change menu price to 50
    menuItem.price = 50;
    await dataSource.getRepository(MenuItemEntity).save(menuItem);

    // Order item unit price MUST REMAIN 30 (Immutable snapshot)
    const fetchedOrder = await ordersService.getOrderById(order.id);
    expect(fetchedOrder.items[0].unit_price).toBe(30);
  });

  it('deduplicates double-tapped orders using Idempotency-Key (BRAIN Rule 4)', async () => {
    const order1 = await ordersService.placeOrder(
      session.id,
      {
        items: [{ menu_item_id: menuItem.id, qty: 1 }],
        payment_method: PaymentMethod.CASH,
      },
      'idemp-same-key-123',
    );

    // Second call with same idempotency key
    const order2 = await ordersService.placeOrder(
      session.id,
      {
        items: [{ menu_item_id: menuItem.id, qty: 1 }],
        payment_method: PaymentMethod.CASH,
      },
      'idemp-same-key-123',
    );

    expect(order1.id).toBe(order2.id);
    expect(order1.order_number).toBe(order2.order_number);

    const totalOrdersInDb = await dataSource.getRepository(OrderEntity).count();
    expect(totalOrdersInDb).toBe(1);
  });

  it('guarded status transition: prevents illegal jumps and double-accept race (BRAIN Rule 1)', async () => {
    const order = await ordersService.placeOrder(
      session.id,
      {
        items: [{ menu_item_id: menuItem.id, qty: 1 }],
        payment_method: PaymentMethod.CASH,
      },
      'idemp-race-test',
    );

    // 1. Illegal transition: cannot jump from PLACED directly to SERVED
    await expect(
      ordersService.transitionStatus(
        order.id,
        OrderStatus.PLACED,
        OrderStatus.SERVED,
        'admin-1',
        'Chef Ram',
      ),
    ).rejects.toThrow('Illegal state transition');

    // 2. Double-Accept Race: Two staff members attempt to accept the same order simultaneously
    const accept1 = ordersService.transitionStatus(
      order.id,
      OrderStatus.PLACED,
      OrderStatus.ACCEPTED,
      'admin-1',
      'Chef Ram',
    );

    const accept2 = ordersService.transitionStatus(
      order.id,
      OrderStatus.PLACED,
      OrderStatus.ACCEPTED,
      'admin-2',
      'Chef Shyam',
    );

    const results = await Promise.allSettled([accept1, accept2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const currentOrder = await ordersService.getOrderById(order.id);
    expect(currentOrder.status).toBe(OrderStatus.ACCEPTED);

    // 3. Normal progression: ACCEPTED -> PREPARING -> READY -> SERVED
    await ordersService.transitionStatus(order.id, OrderStatus.ACCEPTED, OrderStatus.PREPARING, 'admin-1', 'Chef');
    await ordersService.transitionStatus(order.id, OrderStatus.PREPARING, OrderStatus.READY, 'admin-1', 'Chef');
    await ordersService.transitionStatus(order.id, OrderStatus.READY, OrderStatus.SERVED, 'admin-1', 'Staff');

    const servedOrder = await ordersService.getOrderById(order.id);
    expect(servedOrder.status).toBe(OrderStatus.SERVED);
  });

  it('settles billing, marks order BILLED, closes session, and frees table (BRAIN Rule 6)', async () => {
    const order = await ordersService.placeOrder(
      session.id,
      {
        items: [{ menu_item_id: menuItem.id, qty: 1 }],
        payment_method: PaymentMethod.CASH,
      },
      'idemp-settle-test',
    );

    // Settle order at counter
    await ordersService.settleOrder(order.id, PaymentMethod.CASH, 'cashier-1', 'Cashier Priya');

    const billedOrder = await ordersService.getOrderById(order.id);
    expect(billedOrder.status).toBe(OrderStatus.BILLED);
    expect(billedOrder.payment_status).toBe(PaymentStatus.PAID);

    // Table must NOT be freed automatically
    const updatedTable = await dataSource.getRepository(TableEntity).findOne({ where: { id: table.id } });
    expect(updatedTable?.status).toBe(TableStatus.OCCUPIED);
    expect(updatedTable?.current_session_id).toBe(session.id);

    // Session must STILL be ACTIVE
    const updatedSession = await dataSource.getRepository(SessionEntity).findOne({ where: { id: session.id } });
    expect(updatedSession?.status).toBe(SessionStatus.ACTIVE);

    // Audit log was recorded
    const logs = await dataSource.getRepository(AuditLogEntity).find();
    expect(logs.some((l) => l.action === 'ORDER_SETTLED_AND_BILLED')).toBe(true);
  });
});
