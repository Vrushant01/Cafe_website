import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { OrderEntity } from '../../database/entities/order.entity';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import {
  PaymentStatus,
  PaymentMethod,
  OrderStatus,
} from '@chai-partner/shared';

export interface VerifyClientPaymentDto {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

@Injectable()
export class PaymentsService {
  private razorpayClient: Razorpay | null = null;
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor(
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(OrderEntity)
    private orderRepo: Repository<OrderEntity>,
    private dataSource: DataSource,
    private configService: ConfigService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
  ) {
    this.keyId = this.configService.get<string>('payments.razorpayKeyId') || 'rzp_test_placeholder_key';
    this.keySecret = this.configService.get<string>('payments.razorpayKeySecret') || 'rzp_test_placeholder_secret';
    this.webhookSecret = this.configService.get<string>('payments.razorpayWebhookSecret') || 'rzp_webhook_secret_placeholder';

    if (this.keyId && this.keySecret && !this.keyId.includes('placeholder')) {
      try {
        this.razorpayClient = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret,
        });
      } catch (err) {
        console.warn('[Razorpay] SDK initialization failed with configured keys; will use mock fallback:', err);
      }
    }
  }

  /**
   * Create Razorpay order on server side
   */
  async createRazorpayOrder(orderId: string): Promise<{
    razorpay_order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    order_number: string;
  }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['table'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.total <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    const amountInPaise = Math.round(Number(order.total) * 100);
    let rzpOrderId: string;

    // Use official Razorpay SDK if live credentials present; otherwise mock order ID for testing
    if (this.razorpayClient) {
      try {
        const rzpOrder = await this.razorpayClient.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.order_number,
          notes: {
            table_id: order.table_id,
            table_number: String(order.table?.table_number || ''),
          },
        });
        rzpOrderId = rzpOrder.id;
      } catch (err) {
        console.warn('[Razorpay] Live orders.create failed, falling back to local generated order:', err);
        rzpOrderId = `order_rzp_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
    } else {
      rzpOrderId = `order_rzp_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // Associate or create payment record
    let payment = await this.paymentRepo.findOne({ where: { order_id: order.id } });
    if (payment) {
      payment.method = PaymentMethod.RAZORPAY;
      payment.razorpay_order_id = rzpOrderId;
      payment.amount = order.total;
      await this.paymentRepo.save(payment);
    } else {
      payment = this.paymentRepo.create({
        order_id: order.id,
        method: PaymentMethod.RAZORPAY,
        razorpay_order_id: rzpOrderId,
        amount: order.total,
        status: PaymentStatus.PENDING,
      });
      await this.paymentRepo.save(payment);
    }

    return {
      razorpay_order_id: rzpOrderId,
      amount: amountInPaise,
      currency: 'INR',
      key_id: this.keyId,
      order_number: order.order_number,
    };
  }

  /**
   * Verify Client-side Razorpay signature (Browser checkout callback)
   * BRAIN Rule 3: Serves as immediate UI update hint; webhook confirms authority.
   */
  async verifyClientSignature(dto: VerifyClientPaymentDto): Promise<{
    success: boolean;
    payment_status: PaymentStatus;
  }> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new BadRequestException('Missing required Razorpay payment credentials');
    }

    // Verify signature HMAC-SHA256
    const expectedSignature = createHmac('sha256', this.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isMatch =
      razorpay_signature === expectedSignature ||
      (this.keyId.includes('placeholder') && razorpay_signature === 'mock_valid_signature');

    if (!isMatch) {
      throw new BadRequestException('Invalid Razorpay payment signature');
    }

    const payment = await this.paymentRepo.findOne({
      where: { razorpay_order_id },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`No payment record found for order ${razorpay_order_id}`);
    }

    // Guarded update: pending -> advance_paid
    if (payment.status === PaymentStatus.PENDING) {
      payment.status = PaymentStatus.ADVANCE_PAID;
      payment.razorpay_payment_id = razorpay_payment_id;
      await this.paymentRepo.save(payment);

      await this.orderRepo.update(
        { id: payment.order_id },
        { payment_status: PaymentStatus.ADVANCE_PAID },
      );

      // Socket notification
      this.eventsGateway.emitOrderStatusChanged(
        payment.order_id,
        payment.order?.status || OrderStatus.PLACED,
        payment.order?.session_id,
      );
      this.eventsGateway.emitOrderUpdated(payment.order_id, {
        payment_status: PaymentStatus.ADVANCE_PAID,
      });
    }

    return {
      success: true,
      payment_status: payment.status,
    };
  }

  /**
   * Mark a payment explicitly as FAILED when Razorpay reports payment.failed
   * The order remains in the DB (admin can see it in history) and payment_status = FAILED
   */
  async markPaymentFailed(
    orderId: string,
    errorCode?: string,
    errorDescription?: string,
  ): Promise<{ success: boolean }> {
    const payment = await this.paymentRepo.findOne({
      where: { order_id: orderId },
      relations: ['order'],
    });

    if (payment && payment.status === PaymentStatus.PENDING) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);

      await this.orderRepo.update(
        { id: orderId },
        { payment_status: PaymentStatus.FAILED },
      );

      await this.auditService.log({
        actor_id: 'customer',
        actor_type: 'customer',
        action: 'PAYMENT_FAILED_CLIENT',
        entity: 'payments',
        entity_id: payment.id,
        metadata: {
          order_id: orderId,
          error_code: errorCode,
          error_description: errorDescription,
        },
      });
    }

    return { success: true };
  }

  /**
   * BRAIN Rule 3: Webhook endpoint with signature verification & idempotent updates
   * Handles payment.captured and payment.failed events
   */
  async handleWebhook(rawBody: string | Buffer, signature: string): Promise<{ status: string }> {
    if (!signature) {
      throw new BadRequestException('Missing x-razorpay-signature header');
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    // Verify webhook HMAC-SHA256
    const expectedSignature = createHmac('sha256', this.webhookSecret)
      .update(bodyString)
      .digest('hex');

    const isValid =
      signature === expectedSignature ||
      (this.webhookSecret.includes('placeholder') && signature === 'test_mock_webhook_signature');

    if (!isValid) {
      throw new BadRequestException('Webhook signature verification failed');
    }

    let event: any;
    try {
      event = JSON.parse(bodyString);
    } catch {
      throw new BadRequestException('Malformed webhook JSON payload');
    }

    const eventName = event.event;
    console.log(`[Webhook] Received Razorpay event: ${eventName}`);

    if (eventName === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const rzpPaymentId = paymentEntity?.id;

      if (!rzpOrderId) {
        return { status: 'missing_order_id' };
      }

      const payment = await this.paymentRepo.findOne({
        where: { razorpay_order_id: rzpOrderId },
        relations: ['order'],
      });

      if (!payment) {
        console.warn(`[Webhook] No local payment matched for rzpOrderId: ${rzpOrderId}`);
        return { status: 'order_not_found' };
      }

      // Idempotency check: duplicate delivery protection
      if (
        payment.status === PaymentStatus.ADVANCE_PAID ||
        payment.status === PaymentStatus.PAID
      ) {
        console.log(`[Webhook] Duplicate delivery ignored for payment ${payment.id}`);
        return { status: 'already_processed' };
      }

      // Guarded transactional write
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await queryRunner.manager.update(
          PaymentEntity,
          { id: payment.id, status: PaymentStatus.PENDING },
          {
            status: PaymentStatus.ADVANCE_PAID,
            razorpay_payment_id: rzpPaymentId,
          },
        );

        await queryRunner.manager.update(
          OrderEntity,
          { id: payment.order_id },
          { payment_status: PaymentStatus.ADVANCE_PAID },
        );

        await queryRunner.commitTransaction();

        // Audit log (BRAIN Rule 9)
        await this.auditService.log({
          actor_id: 'razorpay-webhook',
          actor_type: 'system',
          action: 'PAYMENT_CAPTURED_WEBHOOK',
          entity: 'payments',
          entity_id: payment.id,
          metadata: {
            order_id: payment.order_id,
            razorpay_payment_id: rzpPaymentId,
            razorpay_order_id: rzpOrderId,
            amount: paymentEntity?.amount,
          },
        });

        // Real-time broadcast
        this.eventsGateway.emitOrderStatusChanged(
          payment.order_id,
          payment.order?.status || OrderStatus.PLACED,
          payment.order?.session_id,
        );
        this.eventsGateway.emitOrderUpdated(payment.order_id, {
          payment_status: PaymentStatus.ADVANCE_PAID,
        });

        return { status: 'captured' };
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    }

    if (eventName === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const errorDesc = paymentEntity?.error_description || 'Payment failed';

      if (rzpOrderId) {
        const payment = await this.paymentRepo.findOne({
          where: { razorpay_order_id: rzpOrderId },
        });

        if (payment) {
          await this.auditService.log({
            actor_id: 'razorpay-webhook',
            actor_type: 'system',
            action: 'PAYMENT_FAILED_WEBHOOK',
            entity: 'payments',
            entity_id: payment.id,
            metadata: {
              error_description: errorDesc,
              error_code: paymentEntity?.error_code,
            },
          });
        }
      }

      return { status: 'failed_recorded' };
    }

    return { status: 'ignored_event' };
  }
}
