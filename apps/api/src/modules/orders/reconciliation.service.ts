import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { OrderEntity } from '../../database/entities/order.entity';
import { AuditService } from '../audit/audit.service';
import { PaymentStatus, maskPhoneNumber } from '@chai-partner/shared';
import { CryptoService } from '../../common/services/crypto.service';

export interface PendingOrderReportItem {
  order_id: string;
  order_number: string;
  table_number: number;
  customer_name: string;
  phone_masked: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  age_minutes: number;
}

export interface ReconciliationReport {
  generated_at: string;
  threshold_hours: number;
  total_pending_orders: number;
  total_uncollected_amount: number;
  orders: PendingOrderReportItem[];
}

@Injectable()
export class ReconciliationService {
  constructor(
    @InjectRepository(OrderEntity)
    private orderRepo: Repository<OrderEntity>,
    private cryptoService: CryptoService,
    private auditService: AuditService,
  ) {}

  async generatePendingPaymentReport(thresholdHours: number = 2): Promise<ReconciliationReport> {
    const thresholdDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    const pendingOrders = await this.orderRepo.find({
      where: {
        payment_status: PaymentStatus.PENDING,
        created_at: LessThan(thresholdDate),
      },
      relations: ['table', 'session'],
      order: {
        created_at: 'ASC',
      },
    });

    let totalUncollected = 0;
    const reportItems: PendingOrderReportItem[] = [];

    for (const order of pendingOrders) {
      const orderTotal = Number(order.total);
      totalUncollected += orderTotal;

      let plainPhone = '';
      if (order.session?.phone) {
        plainPhone = this.cryptoService.decrypt(order.session.phone);
      }

      const ageMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);

      reportItems.push({
        order_id: order.id,
        order_number: order.order_number,
        table_number: order.table?.table_number || 0,
        customer_name: order.session?.customer_name || 'Guest',
        phone_masked: maskPhoneNumber(plainPhone),
        total: orderTotal,
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at.toISOString(),
        age_minutes: ageMinutes,
      });
    }

    const report: ReconciliationReport = {
      generated_at: new Date().toISOString(),
      threshold_hours: thresholdHours,
      total_pending_orders: pendingOrders.length,
      total_uncollected_amount: Math.round(totalUncollected * 100) / 100,
      orders: reportItems,
    };

    // Audit log
    await this.auditService.log({
      actor_id: 'system',
      actor_type: 'system',
      action: 'RECONCILIATION_REPORT_GENERATED',
      entity: 'reports',
      entity_id: 'daily_pending_payments',
      metadata: {
        threshold_hours: thresholdHours,
        total_pending_orders: report.total_pending_orders,
        total_uncollected_amount: report.total_uncollected_amount,
      },
    });

    return report;
  }
}
