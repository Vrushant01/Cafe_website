import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
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
import { PaymentsService } from '../src/modules/payments/payments.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { EventsGateway } from '../src/modules/events/events.gateway';
import {
  PaymentStatus,
  PaymentMethod,
  OrderStatus,
  TableStatus,
  SessionStatus,
  generateSignedQrToken,
} from '@chai-partner/shared';

describe('Phase 2: Razorpay Payments & Webhook Verification (BRAIN Rule 3)', () => {
  let dataSource: DataSource;
  let paymentsService: PaymentsService;
  let auditService: AuditService;
  let order: OrderEntity;
  let payment: PaymentEntity;

  const TEST_KEY_ID = 'rzp_test_fixture_key';
  const TEST_KEY_SECRET = 'rzp_test_fixture_secret_key_123';
  const TEST_WEBHOOK_SECRET = 'rzp_test_webhook_secret_key_456';

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
      payments: {
        razorpayKeyId: TEST_KEY_ID,
        razorpayKeySecret: TEST_KEY_SECRET,
        razorpayWebhookSecret: TEST_WEBHOOK_SECRET,
      },
    });

    const eventsGateway = {
      emitTableStatusChanged: jest.fn(),
      emitOrderStatusChanged: jest.fn(),
      emitNewOrder: jest.fn(),
      emitOrderUpdated: jest.fn(),
      emitAdminAlert: jest.fn(),
    } as unknown as EventsGateway;

    auditService = new AuditService(dataSource.getRepository(AuditLogEntity));

    paymentsService = new PaymentsService(
      dataSource.getRepository(PaymentEntity),
      dataSource.getRepository(OrderEntity),
      dataSource,
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
    await dataSource.synchronize(true);

    const tableRepo = dataSource.getRepository(TableEntity);
    const table = await tableRepo.save(
      tableRepo.create({
        table_number: 10,
        seat_count: 2,
        status: TableStatus.OCCUPIED,
        qr_token: generateSignedQrToken(10, 'chai_partner_qr_signing_secret_min_32_characters_long'),
      }),
    );

    const sessionRepo = dataSource.getRepository(SessionEntity);
    const session = await sessionRepo.save(
      sessionRepo.create({
        table_id: table.id,
        customer_name: 'Priya Verma',
        phone: 'encrypted_phone_priya',
        started_at: new Date(),
        expires_at: new Date(Date.now() + 7200000),
        status: SessionStatus.ACTIVE,
      }),
    );

    const orderRepo = dataSource.getRepository(OrderEntity);
    order = await orderRepo.save(
      orderRepo.create({
        session_id: session.id,
        table_id: table.id,
        order_number: 'CP-1050',
        status: OrderStatus.PLACED,
        payment_status: PaymentStatus.PENDING,
        subtotal: 150,
        tax: 7.5,
        total: 157.5,
      }),
    );

    const paymentRepo = dataSource.getRepository(PaymentEntity);
    payment = await paymentRepo.save(
      paymentRepo.create({
        order_id: order.id,
        method: PaymentMethod.RAZORPAY,
        amount: 157.5,
        status: PaymentStatus.PENDING,
      }),
    );
  });

  it('creates Razorpay order with amount in paise and links razorpay_order_id', async () => {
    const res = await paymentsService.createRazorpayOrder(order.id);

    expect(res.razorpay_order_id).toBeDefined();
    expect(res.amount).toBe(15750); // 157.50 * 100 paise
    expect(res.currency).toBe('INR');
    expect(res.order_number).toBe('CP-1050');

    // Database check
    const updatedPayment = await dataSource.getRepository(PaymentEntity).findOne({ where: { id: payment.id } });
    expect(updatedPayment?.razorpay_order_id).toBe(res.razorpay_order_id);
    expect(updatedPayment?.method).toBe(PaymentMethod.RAZORPAY);
  });

  it('verifies client checkout signature and transitions to advance_paid', async () => {
    const rzpOrder = await paymentsService.createRazorpayOrder(order.id);
    const fakePaymentId = 'pay_test_client_78910';

    // Generate valid HMAC signature
    const validSignature = createHmac('sha256', TEST_KEY_SECRET)
      .update(`${rzpOrder.razorpay_order_id}|${fakePaymentId}`)
      .digest('hex');

    const verifyResult = await paymentsService.verifyClientSignature({
      razorpay_order_id: rzpOrder.razorpay_order_id,
      razorpay_payment_id: fakePaymentId,
      razorpay_signature: validSignature,
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.payment_status).toBe(PaymentStatus.ADVANCE_PAID);

    // Verify order payment_status updated
    const updatedOrder = await dataSource.getRepository(OrderEntity).findOne({ where: { id: order.id } });
    expect(updatedOrder?.payment_status).toBe(PaymentStatus.ADVANCE_PAID);
  });

  it('rejects tampered client checkout signature', async () => {
    const rzpOrder = await paymentsService.createRazorpayOrder(order.id);

    await expect(
      paymentsService.verifyClientSignature({
        razorpay_order_id: rzpOrder.razorpay_order_id,
        razorpay_payment_id: 'pay_tampered_123',
        razorpay_signature: 'invalid_forged_signature_hash',
      }),
    ).rejects.toThrow('Invalid Razorpay payment signature');
  });

  it('webhook: processes payment.captured payload, verifies signature and updates order idempotently (BRAIN Rule 3)', async () => {
    const rzpOrder = await paymentsService.createRazorpayOrder(order.id);
    const rzpPaymentId = 'pay_webhook_live_capt_999';

    // Recorded Razorpay payment.captured webhook payload
    const recordedPayload = {
      entity: 'event',
      account_id: 'acc_test_123',
      event: 'payment.captured',
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: rzpPaymentId,
            entity: 'payment',
            amount: 15750,
            currency: 'INR',
            status: 'captured',
            order_id: rzpOrder.razorpay_order_id,
            method: 'upi',
          },
        },
      },
      created_at: 1716500000,
    };

    const payloadString = JSON.stringify(recordedPayload);
    const validWebhookSignature = createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    // 1. Initial Webhook Delivery
    const firstDelivery = await paymentsService.handleWebhook(payloadString, validWebhookSignature);
    expect(firstDelivery.status).toBe('captured');

    // Verify database state: order must be advance_paid
    const updatedOrder = await dataSource.getRepository(OrderEntity).findOne({ where: { id: order.id } });
    expect(updatedOrder?.payment_status).toBe(PaymentStatus.ADVANCE_PAID);

    const updatedPayment = await dataSource.getRepository(PaymentEntity).findOne({ where: { id: payment.id } });
    expect(updatedPayment?.status).toBe(PaymentStatus.ADVANCE_PAID);
    expect(updatedPayment?.razorpay_payment_id).toBe(rzpPaymentId);

    // Audit trail recorded
    const logs = await dataSource.getRepository(AuditLogEntity).find();
    expect(logs.some((l) => l.action === 'PAYMENT_CAPTURED_WEBHOOK')).toBe(true);

    // 2. Duplicate Webhook Delivery (Idempotency test)
    const duplicateDelivery = await paymentsService.handleWebhook(payloadString, validWebhookSignature);
    expect(duplicateDelivery.status).toBe('already_processed');
  });

  it('webhook: rejects webhook with invalid or tampered signature', async () => {
    const recordedPayload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_fake', order_id: 'order_fake' } } },
    });

    await expect(
      paymentsService.handleWebhook(recordedPayload, 'tampered_signature_hex'),
    ).rejects.toThrow('Webhook signature verification failed');
  });

  it('webhook: records payment.failed event in audit log', async () => {
    const rzpOrder = await paymentsService.createRazorpayOrder(order.id);

    const failedPayload = {
      entity: 'event',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_failed_456',
            order_id: rzpOrder.razorpay_order_id,
            amount: 15750,
            status: 'failed',
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Payment was cancelled by user on UPI app',
          },
        },
      },
    };

    const payloadString = JSON.stringify(failedPayload);
    const validWebhookSignature = createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    const result = await paymentsService.handleWebhook(payloadString, validWebhookSignature);
    expect(result.status).toBe('failed_recorded');

    const logs = await dataSource.getRepository(AuditLogEntity).find();
    expect(logs.some((l) => l.action === 'PAYMENT_FAILED_WEBHOOK')).toBe(true);
  });
});
