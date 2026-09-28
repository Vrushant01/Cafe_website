import { DataSource } from 'typeorm';
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
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { CryptoService } from '../src/common/services/crypto.service';
import {
  TableStatus,
  SessionStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from '@chai-partner/shared';

describe('Phase 5: Analytics & Sales Trends', () => {
  let dataSource: DataSource;
  let analyticsService: AnalyticsService;
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
      },
    });

    cryptoService = new CryptoService(configService);

    analyticsService = new AnalyticsService(
      dataSource.getRepository(OrderEntity),
      dataSource.getRepository(OrderItemEntity),
      dataSource.getRepository(PaymentEntity),
      dataSource.getRepository(SessionEntity),
      dataSource.getRepository(MenuItemEntity),
      cryptoService,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.getRepository(OrderItemEntity).clear();
    await dataSource.getRepository(PaymentEntity).clear();
    await dataSource.getRepository(OrderEntity).clear();
    await dataSource.getRepository(SessionEntity).clear();
    await dataSource.getRepository(TableEntity).clear();
    await dataSource.getRepository(MenuItemEntity).clear();
    await dataSource.getRepository(MenuCategoryEntity).clear();
  });

  it('calculates best-selling items, revenue, and average order value', async () => {
    // 1. Create table & category
    const table = await dataSource.getRepository(TableEntity).save({
      table_number: 1,
      seat_count: 2,
      status: TableStatus.AVAILABLE,
      qr_token: 't1',
    });

    const category = await dataSource.getRepository(MenuCategoryEntity).save({
      name: 'Hot Beverages',
      sort_order: 1,
    });

    const chaiItem = await dataSource.getRepository(MenuItemEntity).save({
      category_id: category.id,
      name: 'Adrak Chai',
      price: 30,
      is_bestseller: true,
      is_available: true,
      veg_flag: true,
    });

    const samosaItem = await dataSource.getRepository(MenuItemEntity).save({
      category_id: category.id,
      name: 'Punjabi Samosa',
      price: 40,
      is_bestseller: false,
      is_available: true,
      veg_flag: true,
    });

    const session = await dataSource.getRepository(SessionEntity).save({
      table_id: table.id,
      customer_name: 'Regular Rohit',
      phone: cryptoService.encrypt('9888812345'),
      started_at: new Date(),
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: SessionStatus.CLOSED,
    });

    // Order 1: 3x Chai, 1x Samosa = 90 + 40 = 130 + 6.5 = 136.50
    const order1 = await dataSource.getRepository(OrderEntity).save({
      session_id: session.id,
      table_id: table.id,
      order_number: 'CP-5001',
      status: OrderStatus.BILLED,
      payment_status: PaymentStatus.PAID,
      subtotal: 130,
      tax: 6.5,
      total: 136.5,
    });

    await dataSource.getRepository(OrderItemEntity).save([
      {
        order_id: order1.id,
        menu_item_id: chaiItem.id,
        item_name: 'Adrak Chai',
        qty: 3,
        unit_price: 30,
      },
      {
        order_id: order1.id,
        menu_item_id: samosaItem.id,
        item_name: 'Punjabi Samosa',
        qty: 1,
        unit_price: 40,
      },
    ]);

    await dataSource.getRepository(PaymentEntity).save({
      order_id: order1.id,
      method: PaymentMethod.CASH,
      amount: 136.5,
      status: PaymentStatus.PAID,
    });

    const stats = await analyticsService.getAnalytics('day');

    expect(stats.total_orders).toBe(1);
    expect(stats.total_revenue).toBe(136.5);
    expect(stats.average_order_value).toBe(136.5);
    expect(stats.payment_breakdown.cash_orders).toBe(1);
    expect(stats.payment_breakdown.cash_revenue).toBe(136.5);

    // Chai should be rank #1 bestseller with 3 qty
    expect(stats.bestsellers.length).toBe(2);
    expect(stats.bestsellers[0].name).toBe('Adrak Chai');
    expect(stats.bestsellers[0].total_qty).toBe(3);
    expect(stats.bestsellers[0].total_revenue).toBe(90);

    // Samosa rank #2 with 1 qty
    expect(stats.bestsellers[1].name).toBe('Punjabi Samosa');
    expect(stats.bestsellers[1].total_qty).toBe(1);
  });

  it('accurately computes repeat-customer rate by phone matching', async () => {
    const tableA = await dataSource.getRepository(TableEntity).save({
      table_number: 2,
      seat_count: 4,
      status: TableStatus.AVAILABLE,
      qr_token: 't2',
    });

    const tableB = await dataSource.getRepository(TableEntity).save({
      table_number: 3,
      seat_count: 2,
      status: TableStatus.AVAILABLE,
      qr_token: 't3',
    });

    const tableC = await dataSource.getRepository(TableEntity).save({
      table_number: 4,
      seat_count: 2,
      status: TableStatus.AVAILABLE,
      qr_token: 't4',
    });

    // Customer A visits twice (phone: 9811122233)
    await dataSource.getRepository(SessionEntity).save({
      table_id: tableA.id,
      customer_name: 'Ananya Roy',
      phone: cryptoService.encrypt('9811122233'),
      started_at: new Date(Date.now() - 3600000),
      expires_at: new Date(),
      status: SessionStatus.CLOSED,
    });

    await dataSource.getRepository(SessionEntity).save({
      table_id: tableB.id,
      customer_name: 'Ananya Roy',
      phone: cryptoService.encrypt('9811122233'),
      started_at: new Date(),
      expires_at: new Date(Date.now() + 3600000),
      status: SessionStatus.ACTIVE,
    });

    // Customer B visits once (phone: 9844455566)
    await dataSource.getRepository(SessionEntity).save({
      table_id: tableC.id,
      customer_name: 'Karan Mehra',
      phone: cryptoService.encrypt('9844455566'),
      started_at: new Date(),
      expires_at: new Date(Date.now() + 3600000),
      status: SessionStatus.ACTIVE,
    });

    // Total distinct = 2 (Ananya, Karan)
    // Repeat customers = 1 (Ananya has 2 sessions)
    // Repeat customer rate = 50.0%
    const stats = await analyticsService.getAnalytics('month');

    expect(stats.total_unique_customers).toBe(2);
    expect(stats.repeat_customers_count).toBe(1);
    expect(stats.repeat_customer_rate).toBe(50);
  });

  it('identifies highest and lowest sales periods by hour', async () => {
    const table = await dataSource.getRepository(TableEntity).save({
      table_number: 5,
      seat_count: 2,
      status: TableStatus.AVAILABLE,
      qr_token: 't5',
    });

    const sess = await dataSource.getRepository(SessionEntity).save({
      table_id: table.id,
      customer_name: 'Deepak',
      phone: cryptoService.encrypt('9899988899'),
      started_at: new Date(),
      expires_at: new Date(Date.now() + 3600000),
      status: SessionStatus.ACTIVE,
    });

    // Create an order at 17:00 (5 PM) with high revenue
    const peakDate = new Date();
    peakDate.setHours(17, 30, 0, 0);

    await dataSource.getRepository(OrderEntity).save({
      session_id: sess.id,
      table_id: table.id,
      order_number: 'CP-PEAK-1',
      status: OrderStatus.BILLED,
      payment_status: PaymentStatus.PAID,
      subtotal: 500,
      tax: 25,
      total: 525,
      created_at: peakDate,
    });

    // Create an order at 10:00 (10 AM) with lower revenue
    const slowDate = new Date();
    slowDate.setHours(10, 15, 0, 0);

    await dataSource.getRepository(OrderEntity).save({
      session_id: sess.id,
      table_id: table.id,
      order_number: 'CP-SLOW-1',
      status: OrderStatus.BILLED,
      payment_status: PaymentStatus.PAID,
      subtotal: 100,
      tax: 5,
      total: 105,
      created_at: slowDate,
    });

    const stats = await analyticsService.getAnalytics('day');

    expect(stats.highest_sales_period).toBeDefined();
    expect(stats.highest_sales_period?.revenue).toBe(525);
    expect(stats.highest_sales_period?.period_label).toBe('5 PM - 6 PM');

    expect(stats.lowest_sales_period).toBeDefined();
    expect(stats.lowest_sales_period?.revenue).toBe(105);
    expect(stats.lowest_sales_period?.period_label).toBe('10 AM - 11 AM');
  });

  it('generates hourly revenue trend buckets for day range', async () => {
    const stats = await analyticsService.getAnalytics('day');
    expect(stats.revenue_trend.length).toBe(24);
    expect(stats.revenue_trend[0].date).toBe('00:00');
    expect(stats.revenue_trend[23].date).toBe('23:00');
  });
});
