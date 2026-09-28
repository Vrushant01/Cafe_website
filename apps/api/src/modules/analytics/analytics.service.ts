import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { OrderEntity } from '../../database/entities/order.entity';
import { OrderItemEntity } from '../../database/entities/order-item.entity';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { SessionEntity } from '../../database/entities/session.entity';
import { MenuItemEntity } from '../../database/entities/menu-item.entity';
import { CryptoService } from '../../common/services/crypto.service';
import {
  IAnalyticsOverview,
  BestsellerStat,
  SalesPeriodStat,
  RevenueTrendPoint,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from '@chai-partner/shared';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(OrderEntity)
    private orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepo: Repository<SessionEntity>,
    @InjectRepository(MenuItemEntity)
    private menuItemRepo: Repository<MenuItemEntity>,
    private cryptoService: CryptoService,
  ) {}

  async getAnalytics(range: 'day' | 'week' | 'month' | 'year' | 'all' = 'day'): Promise<IAnalyticsOverview> {
    const now = new Date();
    let startDate: Date;

    if (range === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (range === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === 'year') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(0); // All time
    }

    // 1. Fetch valid orders within time range (excluding fully cancelled before preparation)
    const orders = await this.orderRepo.find({
      where: {
        created_at: MoreThanOrEqual(startDate),
      },
      relations: ['items', 'items.menu_item', 'items.menu_item.category', 'session'],
      order: { created_at: 'ASC' },
    });

    // 2. Fetch payments within time range
    const payments = await this.paymentRepo.find({
      where: {
        created_at: MoreThanOrEqual(startDate),
      },
    });

    const paymentMap = new Map(payments.map((p) => [p.order_id, p]));

    // 3. Compute Totals & Payment breakdown
    let totalRevenue = 0;
    let validOrderCount = 0;
    let cashOrders = 0;
    let cashRevenue = 0;
    let onlineOrders = 0;
    let onlineRevenue = 0;

    for (const order of orders) {
      if (order.status === OrderStatus.CANCELLED && order.payment_status !== PaymentStatus.REFUNDED) {
        continue;
      }
      validOrderCount++;
      const orderTotal = Number(order.total || 0);
      totalRevenue += orderTotal;

      const p = paymentMap.get(order.id);
      const isCash = !p || p.method === PaymentMethod.CASH;
      if (isCash) {
        cashOrders++;
        cashRevenue += orderTotal;
      } else {
        onlineOrders++;
        onlineRevenue += orderTotal;
      }
    }

    const averageOrderValue = validOrderCount > 0 ? Math.round((totalRevenue / validOrderCount) * 100) / 100 : 0;

    // 4. Best-Selling Items
    const itemAgg = new Map<
      string,
      {
        name: string;
        category_name: string;
        total_qty: number;
        total_revenue: number;
        veg_flag: boolean;
      }
    >();

    for (const order of orders) {
      if (order.status === OrderStatus.CANCELLED) continue;
      for (const item of order.items || []) {
        const id = item.menu_item_id;
        const name = item.menu_item?.name || item.item_name || 'Cafe Item';
        const catName = item.menu_item?.category?.name || 'General';
        const vegFlag = item.menu_item?.veg_flag ?? item.veg_flag ?? true;
        const qty = Number(item.qty || 0);
        const rev = Number(item.unit_price || 0) * qty;

        const existing = itemAgg.get(id) || {
          name,
          category_name: catName,
          total_qty: 0,
          total_revenue: 0,
          veg_flag: vegFlag,
        };
        existing.total_qty += qty;
        existing.total_revenue += rev;
        itemAgg.set(id, existing);
      }
    }

    const bestsellers: BestsellerStat[] = Array.from(itemAgg.entries())
      .map(([item_id, stat]) => ({
        item_id,
        name: stat.name,
        category_name: stat.category_name,
        total_qty: stat.total_qty,
        total_revenue: Math.round(stat.total_revenue * 100) / 100,
        veg_flag: stat.veg_flag,
      }))
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 10);

    // 5. Repeat-Customer Rate (matched by phone hash/decrypt)
    // Find all sessions to calculate repeat customers across history
    const allSessions = await this.sessionRepo.find({
      order: { created_at: 'ASC' },
    });

    const customerVisitCount = new Map<string, number>();

    for (const session of allSessions) {
      if (!session.phone) continue;
      let cleanPhone = '';
      try {
        cleanPhone = this.cryptoService.decrypt(session.phone);
      } catch {
        cleanPhone = session.phone;
      }
      cleanPhone = cleanPhone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        customerVisitCount.set(cleanPhone, (customerVisitCount.get(cleanPhone) || 0) + 1);
      }
    }

    const totalUniqueCustomers = customerVisitCount.size;
    let repeatCustomersCount = 0;
    for (const count of customerVisitCount.values()) {
      if (count > 1) {
        repeatCustomersCount++;
      }
    }

    const repeatCustomerRate =
      totalUniqueCustomers > 0
        ? Math.round((repeatCustomersCount / totalUniqueCustomers) * 1000) / 10
        : 0;

    // 6. Highest & Lowest Sales Periods (Hourly aggregation: 0 - 23)
    const hourlyOrders = new Array(24).fill(0);
    const hourlyRevenue = new Array(24).fill(0);

    for (const order of orders) {
      if (order.status === OrderStatus.CANCELLED) continue;
      const orderDate = new Date(order.created_at);
      const hour = orderDate.getHours();
      hourlyOrders[hour] += 1;
      hourlyRevenue[hour] += Number(order.total || 0);
    }

    let maxRev = -1;
    let maxHour = -1;
    let minRev = Infinity;
    let minHour = -1;

    for (let h = 0; h < 24; h++) {
      if (hourlyRevenue[h] > maxRev && hourlyOrders[h] > 0) {
        maxRev = hourlyRevenue[h];
        maxHour = h;
      }
      if (hourlyRevenue[h] > 0 && hourlyRevenue[h] < minRev) {
        minRev = hourlyRevenue[h];
        minHour = h;
      }
    }

    const formatHourRange = (hour: number) => {
      if (hour < 0) return 'No sales';
      const startPeriod = hour >= 12 ? 'PM' : 'AM';
      const endHour = (hour + 1) % 24;
      const endPeriod = endHour >= 12 ? 'PM' : 'AM';
      const dispStart = hour % 12 === 0 ? 12 : hour % 12;
      const dispEnd = endHour % 12 === 0 ? 12 : endHour % 12;
      return `${dispStart} ${startPeriod} - ${dispEnd} ${endPeriod}`;
    };

    const highestSalesPeriod: SalesPeriodStat | null =
      maxHour >= 0
        ? {
            period_label: formatHourRange(maxHour),
            order_count: hourlyOrders[maxHour],
            revenue: Math.round(hourlyRevenue[maxHour] * 100) / 100,
          }
        : null;

    const lowestSalesPeriod: SalesPeriodStat | null =
      minHour >= 0 && minHour !== maxHour
        ? {
            period_label: formatHourRange(minHour),
            order_count: hourlyOrders[minHour],
            revenue: Math.round(hourlyRevenue[minHour] * 100) / 100,
          }
        : null;

    // 7. Revenue Trend (Time-series buckets)
    const revenueTrend = this.buildRevenueTrend(orders, range, startDate, now);

    return {
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_orders: validOrderCount,
      average_order_value: averageOrderValue,
      repeat_customer_rate: repeatCustomerRate,
      total_unique_customers: totalUniqueCustomers,
      repeat_customers_count: repeatCustomersCount,
      bestsellers,
      highest_sales_period: highestSalesPeriod,
      lowest_sales_period: lowestSalesPeriod,
      revenue_trend: revenueTrend,
      payment_breakdown: {
        cash_orders: cashOrders,
        cash_revenue: Math.round(cashRevenue * 100) / 100,
        online_orders: onlineOrders,
        online_revenue: Math.round(onlineRevenue * 100) / 100,
      },
    };
  }

  private buildRevenueTrend(
    orders: OrderEntity[],
    range: string,
    startDate: Date,
    now: Date,
  ): RevenueTrendPoint[] {
    const trendMap = new Map<string, { label: string; revenue: number; order_count: number }>();

    if (range === 'day') {
      // 24 hours of today
      for (let h = 0; h < 24; h++) {
        const key = `${h.toString().padStart(2, '0')}:00`;
        const disp = h % 12 === 0 ? 12 : h % 12;
        const ampm = h >= 12 ? 'PM' : 'AM';
        trendMap.set(key, { label: `${disp} ${ampm}`, revenue: 0, order_count: 0 });
      }

      for (const order of orders) {
        if (order.status === OrderStatus.CANCELLED) continue;
        const d = new Date(order.created_at);
        const key = `${d.getHours().toString().padStart(2, '0')}:00`;
        const existing = trendMap.get(key);
        if (existing) {
          existing.revenue += Number(order.total || 0);
          existing.order_count += 1;
        }
      }
    } else {
      // Days bucketing (last 7 days, 30 days, or monthly)
      const dayCount = range === 'week' ? 7 : range === 'month' ? 30 : 14;
      const msPerDay = 24 * 60 * 60 * 1000;

      for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * msPerDay);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-IN', {
          weekday: range === 'week' ? 'short' : undefined,
          month: 'short',
          day: 'numeric',
        });
        trendMap.set(dateStr, { label, revenue: 0, order_count: 0 });
      }

      for (const order of orders) {
        if (order.status === OrderStatus.CANCELLED) continue;
        const d = new Date(order.created_at);
        const dateStr = d.toISOString().split('T')[0];
        const existing = trendMap.get(dateStr);
        if (existing) {
          existing.revenue += Number(order.total || 0);
          existing.order_count += 1;
        }
      }
    }

    return Array.from(trendMap.entries()).map(([date, val]) => ({
      date,
      label: val.label,
      revenue: Math.round(val.revenue * 100) / 100,
      order_count: val.order_count,
    }));
  }
}
