'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { IAnalyticsOverview, AdminRole } from '@chai-partner/shared';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Users,
  Award,
  Clock,
  CreditCard,
  Banknote,
  Calendar,
  Flame,
  Coffee,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const router = useRouter();

  const [analytics, setAnalytics] = useState<IAnalyticsOverview | null>(null);
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  const { setHeaderState } = useAdminHeader();
  useEffect(() => {
    setHeaderState({ onRefresh: fetchAnalytics });
    return () => setHeaderState({});
  }, [setHeaderState]); // fetchAnalytics is omitted intentionally

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<IAnalyticsOverview>(`/admin/analytics?range=${range}`);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const rawUser = localStorage.getItem('cp_admin_user');
    if (!rawUser) {
      router.push('/admin/login');
      return;
    }
    fetchAnalytics();
  }, [range]);

  // Max revenue for scaling chart bars
  const maxRevenueInTrend = Math.max(
    ...(analytics?.revenue_trend.map((p) => p.revenue) || [100]),
    100,
  );

  return (
    <div className="w-full h-full pb-20">

      {/* Date Range Selector Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-surface border border-cream-dark/60 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-terracotta" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-sage">Analytics Timeframe:</h2>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'day', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'year', label: 'Last 365 Days' },
            { id: 'all', label: 'All Time' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id as any)}
              className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                range === r.id
                  ? 'bg-coffee text-cream shadow-xs'
                  : 'bg-cream/50 text-coffee/70 hover:bg-cream border border-cream-dark'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-light border border-error/30 rounded-2xl flex items-center gap-2 text-xs font-bold text-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !analytics ? (
        /* Skeleton loading grid */
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-surface rounded-2xl border border-cream-dark/60"></div>
            ))}
          </div>
          <div className="h-72 bg-surface rounded-2xl border border-cream-dark/60"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-80 bg-surface rounded-2xl border border-cream-dark/60"></div>
            <div className="h-80 bg-surface rounded-2xl border border-cream-dark/60"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Revenue */}
            <div className="bg-surface border border-cream-dark/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-sage mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-terracotta">
                  ₹{Number(analytics?.total_revenue || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-coffee/60 mt-1">
                  Cash: ₹{Number(analytics?.payment_breakdown.cash_revenue || 0).toLocaleString()} | Online: ₹{Number(analytics?.payment_breakdown.online_revenue || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* KPI 2: Total Orders */}
            <div className="bg-surface border border-cream-dark/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-sage mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
                <div className="w-8 h-8 rounded-xl bg-amber/15 text-amber flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-coffee">
                  {analytics?.total_orders || 0}
                </div>
                <div className="text-[11px] text-coffee/60 mt-1">
                  Across {analytics?.total_unique_customers || 0} distinct patrons
                </div>
              </div>
            </div>

            {/* KPI 3: Average Order Value */}
            <div className="bg-surface border border-cream-dark/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-sage mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Average Bill (AOV)</span>
                <div className="w-8 h-8 rounded-xl bg-sage/15 text-sage flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-coffee">
                  ₹{Number(analytics?.average_order_value || 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-coffee/60 mt-1">
                  Average spend per order
                </div>
              </div>
            </div>

            {/* KPI 4: Repeat Customer Rate */}
            <div className="bg-surface border border-cream-dark/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-sage mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Repeat Customer Rate</span>
                <div className="w-8 h-8 rounded-xl bg-success-light text-success flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-serif font-bold text-success">
                  {Number(analytics?.repeat_customer_rate || 0).toFixed(1)}%
                </div>
                <div className="text-[11px] text-coffee/60 mt-1">
                  {analytics?.repeat_customers_count || 0} repeat of {analytics?.total_unique_customers || 0} customers
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Trend Visual Bar Chart */}
          <section className="bg-surface border border-cream-dark/60 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="font-serif font-bold text-coffee text-base">Revenue & Order Trend</h3>
                <p className="text-xs text-sage font-medium">
                  {range === 'day' ? 'Hourly sales volume throughout today' : 'Sales volume across days in selected timeframe'}
                </p>
              </div>

              {hoveredPoint && (
                <div className="px-3 py-1.5 bg-cream rounded-xl border border-cream-dark text-xs flex items-center gap-3 animate-in fade-in">
                  <span className="font-bold text-coffee">{hoveredPoint.label}</span>
                  <span className="font-serif font-bold text-terracotta">₹{Number(hoveredPoint.revenue).toLocaleString()}</span>
                  <span className="text-sage">({hoveredPoint.order_count} orders)</span>
                </div>
              )}
            </div>

            {/* Chart Area */}
            <div className="h-60 flex items-end gap-1.5 sm:gap-2.5 pt-6 pb-2 border-b border-cream-dark/40 overflow-x-auto">
              {(analytics?.revenue_trend || []).map((pt, idx) => {
                const heightPercent = maxRevenueInTrend > 0 ? Math.max((pt.revenue / maxRevenueInTrend) * 100, 4) : 4;
                const isHovered = hoveredPoint?.date === pt.date;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="flex-1 min-w-[20px] sm:min-w-[28px] h-full flex flex-col justify-end items-center group cursor-pointer"
                  >
                    {/* Tooltip on top on hover */}
                    <div className="w-full flex items-end justify-center h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[32px] rounded-t-lg transition-all ${
                          isHovered
                            ? 'bg-terracotta shadow-md'
                            : pt.revenue > 0
                            ? 'bg-terracotta/75 hover:bg-terracotta'
                            : 'bg-cream-dark/30'
                        }`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between pt-2 text-[10px] font-semibold text-sage overflow-hidden">
              {analytics?.revenue_trend
                ?.filter((_, idx) => range === 'day' ? idx % 3 === 0 : true)
                .map((pt, idx) => (
                  <span key={idx} className="truncate px-1 text-center">
                    {pt.label}
                  </span>
                ))}
            </div>
          </section>

          {/* Middle Row: Peak vs Slowest Sales Hours & Payment Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Peak Sales Period Card */}
            <div className="bg-surface border border-cream-dark/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-terracotta mb-2">
                  <Flame className="w-4 h-4 fill-terracotta" />
                  <span className="text-xs font-bold uppercase tracking-wider">Peak Sales Rush Hour</span>
                </div>
                <div className="text-xl font-serif font-bold text-coffee">
                  {analytics?.highest_sales_period ? analytics.highest_sales_period.period_label : 'No peak data'}
                </div>
                <p className="text-xs text-sage font-medium mt-1">
                  Highest customer ordering rush of the period
                </p>
              </div>

              {analytics?.highest_sales_period && (
                <div className="mt-4 pt-3 border-t border-cream-dark/40 flex justify-between text-xs">
                  <span className="font-semibold text-coffee">{analytics.highest_sales_period.order_count} orders</span>
                  <span className="font-serif font-bold text-terracotta">₹{analytics.highest_sales_period.revenue}</span>
                </div>
              )}
            </div>

            {/* Slowest Sales Period Card */}
            <div className="bg-surface border border-cream-dark/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sage mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Slowest Sales Window</span>
                </div>
                <div className="text-xl font-serif font-bold text-coffee">
                  {analytics?.lowest_sales_period ? analytics.lowest_sales_period.period_label : 'Steady all day'}
                </div>
                <p className="text-xs text-sage font-medium mt-1">
                  Ideal window for kitchen prep & inventory restock
                </p>
              </div>

              {analytics?.lowest_sales_period && (
                <div className="mt-4 pt-3 border-t border-cream-dark/40 flex justify-between text-xs">
                  <span className="font-semibold text-coffee">{analytics.lowest_sales_period.order_count} orders</span>
                  <span className="font-serif font-bold text-coffee">₹{analytics.lowest_sales_period.revenue}</span>
                </div>
              )}
            </div>

            {/* Payment Channel Distribution */}
            <div className="bg-surface border border-cream-dark/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sage mb-2">
                  <CreditCard className="w-4 h-4 text-terracotta" />
                  <span className="text-xs font-bold uppercase tracking-wider">Payment Channels</span>
                </div>
                <div className="text-sm font-bold text-coffee">Cash vs Online Split</div>
              </div>

              {/* Progress bar split */}
              <div className="my-3">
                {analytics && analytics.total_revenue > 0 ? (
                  <>
                    <div className="h-3 w-full bg-cream-dark rounded-full overflow-hidden flex">
                      <div
                        style={{
                          width: `${(analytics.payment_breakdown.online_revenue / analytics.total_revenue) * 100}%`,
                        }}
                        className="bg-terracotta transition-all"
                        title="Razorpay / UPI"
                      ></div>
                      <div
                        style={{
                          width: `${(analytics.payment_breakdown.cash_revenue / analytics.total_revenue) * 100}%`,
                        }}
                        className="bg-sage transition-all"
                        title="Cash"
                      ></div>
                    </div>

                    <div className="flex justify-between text-[11px] font-semibold mt-2">
                      <span className="flex items-center gap-1.5 text-terracotta">
                        <span className="w-2 h-2 rounded-full bg-terracotta"></span>
                        Online ({analytics.payment_breakdown.online_orders} orders)
                      </span>
                      <span className="flex items-center gap-1.5 text-sage">
                        <span className="w-2 h-2 rounded-full bg-sage"></span>
                        Cash ({analytics.payment_breakdown.cash_orders} orders)
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-sage">No revenue in this timeframe.</p>
                )}
              </div>

              <div className="pt-2 border-t border-cream-dark/40 flex justify-between text-xs font-bold">
                <span className="text-terracotta">₹{Number(analytics?.payment_breakdown.online_revenue || 0).toLocaleString()}</span>
                <span className="text-sage">₹{Number(analytics?.payment_breakdown.cash_revenue || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Bottom Section: Best-Selling Items Leaderboard */}
          <section className="bg-surface border border-cream-dark/60 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber" />
                <h3 className="font-serif font-bold text-coffee text-base">Best-Selling Menu Items</h3>
              </div>
              <span className="text-xs font-semibold text-sage">Top {analytics?.bestsellers.length || 0} by volume</span>
            </div>

            {(!analytics?.bestsellers || analytics.bestsellers.length === 0) ? (
              <div className="text-center py-8 text-xs font-semibold text-coffee/60">
                No menu items sold yet in this timeframe.
              </div>
            ) : (
              <div className="space-y-2.5">
                {analytics.bestsellers.map((item, idx) => {
                  const percentOfTotal =
                    analytics.total_revenue > 0
                      ? Math.round((item.total_revenue / analytics.total_revenue) * 100)
                      : 0;

                  return (
                    <div
                      key={item.item_id}
                      className="p-3 bg-cream/40 border border-cream-dark rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-terracotta/30 transition-colors"
                    >
                      {/* Rank & Item details */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            idx === 0
                              ? 'bg-amber text-cream shadow-xs'
                              : idx === 1
                              ? 'bg-sage text-cream'
                              : idx === 2
                              ? 'bg-terracotta/80 text-cream'
                              : 'bg-cream text-coffee/70 border border-cream-dark'
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        {/* Pure Veg Indicator */}
                        <div
                          className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center flex-shrink-0 ${
                            item.veg_flag ? 'border-success bg-white' : 'border-terracotta bg-white'
                          }`}
                          title={item.veg_flag ? 'Pure Vegetarian' : 'Non-Vegetarian'}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.veg_flag ? 'bg-success' : 'bg-terracotta'
                            }`}
                          ></span>
                        </div>

                        <div>
                          <div className="font-bold text-coffee text-xs leading-tight">{item.name}</div>
                          <div className="text-[10px] text-sage">{item.category_name}</div>
                        </div>
                      </div>

                      {/* Stats: Qty & Revenue */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 text-xs">
                        <div className="text-right">
                          <div className="font-bold text-coffee">{item.total_qty} sold</div>
                          <div className="text-[10px] text-sage">{percentOfTotal}% of total revenue</div>
                        </div>

                        <div className="text-right min-w-[70px]">
                          <div className="font-serif font-bold text-terracotta text-sm">
                            ₹{item.total_revenue.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
