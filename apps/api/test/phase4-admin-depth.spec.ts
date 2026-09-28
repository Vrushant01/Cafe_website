import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
import { RefundsService } from '../src/modules/refunds/refunds.service';
import { MenuService } from '../src/modules/menu/menu.service';
import { OrdersService } from '../src/modules/orders/orders.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { CryptoService } from '../src/common/services/crypto.service';
import { EventsGateway } from '../src/modules/events/events.gateway';
import { RolesGuard, Roles, ROLES_KEY } from '../src/common/guards/roles.guard';
import { AdminAuthGuard } from '../src/common/guards/admin-auth.guard';
import {
  TableStatus,
  SessionStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  AdminRole,
} from '@chai-partner/shared';

describe('Phase 4: Admin Depth (RBAC, Menu Management, Order History, Refund Logging)', () => {
  let dataSource: DataSource;
  let refundsService: RefundsService;
  let menuService: MenuService;
  let ordersService: OrdersService;
  let auditService: AuditService;
  let cryptoService: CryptoService;
  let jwtService: JwtService;
  let rolesGuard: RolesGuard;
  let adminAuthGuard: AdminAuthGuard;
  let reflector: Reflector;

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
      jwt: { secret: 'test_jwt_phase4_secret' },
    });

    cryptoService = new CryptoService(configService);
    jwtService = new JwtService({ secret: 'test_jwt_phase4_secret' });

    const eventsGateway = {
      emitTableStatusChanged: jest.fn(),
      emitOrderStatusChanged: jest.fn(),
      emitNewOrder: jest.fn(),
      emitOrderUpdated: jest.fn(),
      emitAdminAlert: jest.fn(),
      server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    } as unknown as EventsGateway;

    const auditRepo = dataSource.getRepository(AuditLogEntity);
    auditService = new AuditService(auditRepo);

    refundsService = new RefundsService(
      dataSource.getRepository(RefundEntity),
      dataSource.getRepository(PaymentEntity),
      dataSource.getRepository(OrderEntity),
      dataSource.getRepository(TableEntity),
      dataSource,
      auditService,
      eventsGateway,
    );

    menuService = new MenuService(
      dataSource.getRepository(MenuCategoryEntity),
      dataSource.getRepository(MenuItemEntity),
      auditService,
    );

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
      cryptoService,
    );

    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    adminAuthGuard = new AdminAuthGuard(jwtService, configService);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('BRAIN Rule 7: Refund Logging Workflow', () => {
    let testTable: TableEntity;
    let testSession: SessionEntity;
    let testOrder: OrderEntity;

    beforeEach(async () => {
      // Clear data
      await dataSource.getRepository(RefundEntity).clear();
      await dataSource.getRepository(PaymentEntity).clear();
      await dataSource.getRepository(OrderItemEntity).clear();
      await dataSource.getRepository(OrderEntity).clear();
      await dataSource.getRepository(SessionEntity).clear();
      await dataSource.getRepository(TableEntity).clear();
      await dataSource.getRepository(AuditLogEntity).clear();

      testTable = await dataSource.getRepository(TableEntity).save({
        table_number: 10,
        seat_count: 4,
        status: TableStatus.OCCUPIED,
        qr_token: 'table_10_token',
      });

      testSession = await dataSource.getRepository(SessionEntity).save({
        table_id: testTable.id,
        customer_name: 'Rahul Sharma',
        phone: cryptoService.encrypt('9876543210'),
        started_at: new Date(),
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: SessionStatus.ACTIVE,
      });

      testOrder = await dataSource.getRepository(OrderEntity).save({
        session_id: testSession.id,
        table_id: testTable.id,
        order_number: 'CP-1001',
        status: OrderStatus.ACCEPTED,
        payment_status: PaymentStatus.PENDING,
        subtotal: 200,
        tax: 10,
        total: 210,
      });

      await dataSource.getRepository(PaymentEntity).save({
        order_id: testOrder.id,
        method: PaymentMethod.CASH,
        amount: 210,
        status: PaymentStatus.PENDING,
      });
    });

    it('rejects cancellation if reason is missing or too short', async () => {
      await expect(
        refundsService.processRefundAndCancelOrder(
          testOrder.id,
          { amount: 210, reason: '' },
          'Staff Cashier',
        ),
      ).rejects.toThrow('A valid reason is mandatory for processing a cancellation and refund');

      await expect(
        refundsService.processRefundAndCancelOrder(
          testOrder.id,
          { amount: 210, reason: 'no' },
          'Staff Cashier',
        ),
      ).rejects.toThrow('A valid reason is mandatory for processing a cancellation and refund');
    });

    it('rejects refund if amount exceeds order total or is zero', async () => {
      await expect(
        refundsService.processRefundAndCancelOrder(
          testOrder.id,
          { amount: 0, reason: 'Customer changed mind' },
          'Staff Cashier',
        ),
      ).rejects.toThrow('Refund amount must be greater than zero');

      await expect(
        refundsService.processRefundAndCancelOrder(
          testOrder.id,
          { amount: 500, reason: 'Customer changed mind' },
          'Staff Cashier',
        ),
      ).rejects.toThrow('cannot exceed the order total');
    });

    it('creates refund record first, updates order & payment, and frees table when last order cancelled', async () => {
      const result = await refundsService.processRefundAndCancelOrder(
        testOrder.id,
        { amount: 210, reason: 'Spilled tea before serving, guest requested full refund' },
        'Manager Bob',
      );

      // 1. Refund record exists
      expect(result.refund).toBeDefined();
      expect(result.refund.amount).toBe(210);
      expect(result.refund.reason).toBe(
        'Spilled tea before serving, guest requested full refund',
      );
      expect(result.refund.processed_by).toBe('Manager Bob');

      // 2. Order status updated to CANCELLED and REFUNDED
      expect(result.order.status).toBe(OrderStatus.CANCELLED);
      expect(result.order.payment_status).toBe(PaymentStatus.REFUNDED);

      // 3. Payment updated to REFUNDED in DB
      const paymentInDb = await dataSource
        .getRepository(PaymentEntity)
        .findOne({ where: { order_id: testOrder.id } });
      expect(paymentInDb?.status).toBe(PaymentStatus.REFUNDED);

      // 4. Audit Log written (BRAIN Rule 9)
      const auditEntry = await dataSource.getRepository(AuditLogEntity).findOne({
        where: { action: 'ORDER_CANCELLED_WITH_REFUND', entity_id: testOrder.id },
      });
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.metadata?.refund_amount).toBe(210);
      expect(auditEntry?.metadata?.processed_by).toBe('Manager Bob');
      expect(auditEntry?.metadata?.table_freed).toBe(true);

      // 5. Table freed because no other unbilled orders remain (BRAIN Rule 6)
      const tableInDb = await dataSource.getRepository(TableEntity).findOne({
        where: { id: testTable.id },
      });
      expect(tableInDb?.status).toBe(TableStatus.AVAILABLE);
    });

    it('rejects double cancellation on an already cancelled order', async () => {
      await refundsService.processRefundAndCancelOrder(
        testOrder.id,
        { amount: 210, reason: 'Customer left' },
        'Staff Cashier',
      );

      await expect(
        refundsService.processRefundAndCancelOrder(
          testOrder.id,
          { amount: 210, reason: 'Try again' },
          'Staff Cashier',
        ),
      ).rejects.toThrow('This order is already cancelled');
    });
  });

  describe('Menu Management & Price Edit Audit Trail', () => {
    let category: MenuCategoryEntity;

    beforeEach(async () => {
      await dataSource.getRepository(AuditLogEntity).clear();
      await dataSource.getRepository(MenuItemEntity).clear();
      await dataSource.getRepository(MenuCategoryEntity).clear();

      category = await dataSource.getRepository(MenuCategoryEntity).save({
        name: 'Special Chai',
        sort_order: 1,
      });
    });

    it('creates menu item and records MENU_ITEM_CREATED in audit log', async () => {
      const item = await menuService.addItem(
        {
          category_id: category.id,
          name: 'Adrak Elaichi Chai',
          description: 'Crushed ginger and green cardamom simmered in milk',
          price: 45,
          is_bestseller: true,
          veg_flag: true,
        },
        'admin-user-1',
      );

      expect(item.id).toBeDefined();
      expect(item.name).toBe('Adrak Elaichi Chai');
      expect(item.price).toBe(45);
      expect(item.is_bestseller).toBe(true);

      const audit = await dataSource.getRepository(AuditLogEntity).findOne({
        where: { action: 'MENU_ITEM_CREATED', entity_id: item.id },
      });
      expect(audit).toBeDefined();
      expect(audit?.metadata?.item_name).toBe('Adrak Elaichi Chai');
      expect(audit?.metadata?.price).toBe(45);
    });

    it('updates price and writes MENU_ITEM_PRICE_UPDATE with old and new price to audit log', async () => {
      const item = await menuService.addItem(
        {
          category_id: category.id,
          name: 'Masala Chai',
          price: 40,
        },
        'admin-user-1',
      );

      // Edit price from 40 to 50
      const updated = await menuService.updateItem(
        item.id,
        { price: 50 },
        'manager-owner',
      );

      expect(Number(updated.price)).toBe(50);

      const priceAudit = await dataSource.getRepository(AuditLogEntity).findOne({
        where: { action: 'MENU_ITEM_PRICE_UPDATE', entity_id: item.id },
      });
      expect(priceAudit).toBeDefined();
      expect(priceAudit?.metadata?.old_price).toBe(40);
      expect(priceAudit?.metadata?.new_price).toBe(50);
      expect(priceAudit?.actor_id).toBe('manager-owner');
    });

    it('toggles availability and logs MENU_ITEM_AVAILABILITY_TOGGLE', async () => {
      const item = await menuService.addItem(
        {
          category_id: category.id,
          name: 'Bun Maska',
          price: 60,
          is_available: true,
        },
        'admin-user-1',
      );

      // Toggle to unavailable
      const toggled = await menuService.toggleAvailability(item.id, 'kitchen-chef');
      expect(toggled.is_available).toBe(false);

      const audit = await dataSource.getRepository(AuditLogEntity).findOne({
        where: { action: 'MENU_ITEM_AVAILABILITY_TOGGLE', entity_id: item.id },
      });
      expect(audit).toBeDefined();
      expect(audit?.metadata?.is_available).toBe(false);
    });

    it('toggles bestseller and logs MENU_ITEM_BESTSELLER_TOGGLE', async () => {
      const item = await menuService.addItem(
        {
          category_id: category.id,
          name: 'Kulhad Chai',
          price: 55,
          is_bestseller: false,
        },
        'admin-user-1',
      );

      const toggled = await menuService.toggleBestseller(item.id, 'admin-user-1');
      expect(toggled.is_bestseller).toBe(true);

      const audit = await dataSource.getRepository(AuditLogEntity).findOne({
        where: { action: 'MENU_ITEM_BESTSELLER_TOGGLE', entity_id: item.id },
      });
      expect(audit).toBeDefined();
      expect(audit?.metadata?.is_bestseller).toBe(true);
    });

    it('deletes menu item and logs MENU_ITEM_DELETED', async () => {
      const item = await menuService.addItem(
        {
          category_id: category.id,
          name: 'Seasonal Drink',
          price: 80,
        },
        'admin-user-1',
      );

      const res = await menuService.deleteItem(item.id, 'admin-user-1');
      expect(res.success).toBe(true);
      expect(res.deleted_item_name).toBe('Seasonal Drink');

      const found = await dataSource.getRepository(MenuItemEntity).findOne({
        where: { id: item.id },
      });
      expect(found).toBeNull();

      const audit = await dataSource.getRepository(AuditLogEntity).findOne({
        where: { action: 'MENU_ITEM_DELETED', entity_id: item.id },
      });
      expect(audit).toBeDefined();
      expect(audit?.metadata?.deleted_item_name).toBe('Seasonal Drink');
    });
  });

  describe('Order History with Multi-Criteria Search & Date Filtering', () => {
    let table1: TableEntity;
    let table2: TableEntity;

    beforeEach(async () => {
      await dataSource.getRepository(RefundEntity).clear();
      await dataSource.getRepository(PaymentEntity).clear();
      await dataSource.getRepository(OrderItemEntity).clear();
      await dataSource.getRepository(OrderEntity).clear();
      await dataSource.getRepository(SessionEntity).clear();
      await dataSource.getRepository(TableEntity).clear();

      table1 = await dataSource.getRepository(TableEntity).save({
        table_number: 3,
        seat_count: 2,
        status: TableStatus.AVAILABLE,
        qr_token: 't3_token',
      });

      table2 = await dataSource.getRepository(TableEntity).save({
        table_number: 8,
        seat_count: 4,
        status: TableStatus.AVAILABLE,
        qr_token: 't8_token',
      });

      // Session 1: Amit Patel, Phone: 9876540001
      const sess1 = await dataSource.getRepository(SessionEntity).save({
        table_id: table1.id,
        customer_name: 'Amit Patel',
        phone: cryptoService.encrypt('9876540001'),
        started_at: new Date(),
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: SessionStatus.CLOSED,
      });

      // Session 2: Priya Desai, Phone: 9123456789
      const sess2 = await dataSource.getRepository(SessionEntity).save({
        table_id: table2.id,
        customer_name: 'Priya Desai',
        phone: cryptoService.encrypt('9123456789'),
        started_at: new Date(),
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: SessionStatus.CLOSED,
      });

      // Order 1: Amit Patel, Cash, Billed, Total 105
      const o1 = await dataSource.getRepository(OrderEntity).save({
        session_id: sess1.id,
        table_id: table1.id,
        order_number: 'CP-2001',
        status: OrderStatus.BILLED,
        payment_status: PaymentStatus.PAID,
        subtotal: 100,
        tax: 5,
        total: 105,
      });
      await dataSource.getRepository(PaymentEntity).save({
        order_id: o1.id,
        method: PaymentMethod.CASH,
        amount: 105,
        status: PaymentStatus.PAID,
      });

      // Order 2: Priya Desai, Razorpay, Billed, Total 315
      const o2 = await dataSource.getRepository(OrderEntity).save({
        session_id: sess2.id,
        table_id: table2.id,
        order_number: 'CP-2002',
        status: OrderStatus.BILLED,
        payment_status: PaymentStatus.PAID,
        subtotal: 300,
        tax: 15,
        total: 315,
      });
      await dataSource.getRepository(PaymentEntity).save({
        order_id: o2.id,
        method: PaymentMethod.RAZORPAY,
        amount: 315,
        status: PaymentStatus.PAID,
        razorpay_payment_id: 'pay_rzp_test_123',
      });
    });

    it('returns all order history with computed total revenue and masked phone', async () => {
      const result = await ordersService.getOrderHistory({ range: 'all' });
      expect(result.total).toBe(2);
      expect(result.totalRevenue).toBe(420); // 105 + 315
      expect(result.orders.length).toBe(2);

      const amitOrder = result.orders.find((o) => o.order_number === 'CP-2001');
      expect(amitOrder).toBeDefined();
      expect(amitOrder.session.customer_name).toBe('Amit Patel');
      expect(amitOrder.phone_masked).toBe('+91 ******0001');
      expect(amitOrder.payment_method).toBe(PaymentMethod.CASH);

      const priyaOrder = result.orders.find((o) => o.order_number === 'CP-2002');
      expect(priyaOrder).toBeDefined();
      expect(priyaOrder.phone_masked).toBe('+91 ******6789');
      expect(priyaOrder.payment_method).toBe(PaymentMethod.RAZORPAY);
    });

    it('filters orders by search query (customer name, order number, decrypted phone)', async () => {
      // 1. Search by customer name
      const byName = await ordersService.getOrderHistory({ search: 'desai' });
      expect(byName.total).toBe(1);
      expect(byName.orders[0].order_number).toBe('CP-2002');

      // 2. Search by order number
      const byOrderNum = await ordersService.getOrderHistory({ search: 'CP-2001' });
      expect(byOrderNum.total).toBe(1);
      expect(byOrderNum.orders[0].order_number).toBe('CP-2001');

      // 3. Search by phone number (matches decrypted phone)
      const byPhone = await ordersService.getOrderHistory({ search: '540001' });
      expect(byPhone.total).toBe(1);
      expect(byPhone.orders[0].session.customer_name).toBe('Amit Patel');
    });

    it('filters orders by payment method', async () => {
      const cashOnly = await ordersService.getOrderHistory({
        payment_method: PaymentMethod.CASH,
      });
      expect(cashOnly.total).toBe(1);
      expect(cashOnly.orders[0].order_number).toBe('CP-2001');

      const razorpayOnly = await ordersService.getOrderHistory({
        payment_method: PaymentMethod.RAZORPAY,
      });
      expect(razorpayOnly.total).toBe(1);
      expect(razorpayOnly.orders[0].order_number).toBe('CP-2002');
    });
  });

  describe('Role-Based Access Control (RBAC Guard & AdminAuthGuard)', () => {
    function createMockContext(user: any, roles?: AdminRole[]): ExecutionContext {
      const handler = () => {};
      if (roles) {
        Reflect.defineMetadata(ROLES_KEY, roles, handler);
      }
      return {
        getHandler: () => handler,
        getClass: () => class TestController {},
        switchToHttp: () => ({
          getRequest: () => ({
            user,
            headers: {},
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('allows access when user role matches allowed roles', () => {
      const context = createMockContext(
        { id: '1', role: AdminRole.ADMIN },
        [AdminRole.ADMIN, AdminRole.CASHIER],
      );
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('blocks access with ForbiddenException when user has insufficient role', () => {
      const context = createMockContext(
        { id: '2', role: AdminRole.KITCHEN },
        [AdminRole.ADMIN, AdminRole.CASHIER],
      );
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('blocks unauthenticated requests when user is undefined in RolesGuard', () => {
      const context = createMockContext(undefined, [AdminRole.ADMIN]);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('AdminAuthGuard accepts valid signed JWT bearer token and sets req.user', () => {
      const token = jwtService.sign({
        sub: 'admin-123',
        name: 'Manager Dave',
        role: AdminRole.ADMIN,
        email: 'dave@chaipartner.in',
      });

      const mockReq: any = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => mockReq }),
      } as unknown as ExecutionContext;

      expect(adminAuthGuard.canActivate(context)).toBe(true);
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.role).toBe(AdminRole.ADMIN);
      expect(mockReq.user.name).toBe('Manager Dave');
    });

    it('AdminAuthGuard throws UnauthorizedException on missing or invalid token', () => {
      const mockReq: any = { headers: {} };
      const context = {
        switchToHttp: () => ({ getRequest: () => mockReq }),
      } as unknown as ExecutionContext;

      expect(() => adminAuthGuard.canActivate(context)).toThrow(UnauthorizedException);

      mockReq.headers.authorization = 'Bearer invalid.bogus.token';
      expect(() => adminAuthGuard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
