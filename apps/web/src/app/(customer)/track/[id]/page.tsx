'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getSocket, useSocketResync } from '@/lib/socket';
import { Skeleton } from '@/components/ui/Skeleton';
import { IOrder, OrderStatus, PaymentStatus, SOCKET_EVENTS } from '@chai-partner/shared';
import {
  Coffee,
  CheckCircle2,
  Clock,
  ChefHat,
  Utensils,
  Plus,
  ArrowRight,
  AlertTriangle,
  Receipt,
  BellRing,
  List,
  X,
} from 'lucide-react';
import { VegIndicator } from '@/components/ui/Badge';
import { ExitButton } from '@/components/ui/ExitButton';
import { EndSessionButton } from '@/components/ui/EndSessionButton';

const STAGES = [
  { key: OrderStatus.PLACED, title: 'Ordered', desc: 'Received by kitchen' },
  { key: OrderStatus.ACCEPTED, title: 'Accepted', desc: 'Acknowledged by chefs' },
  { key: OrderStatus.PREPARING, title: 'Preparing', desc: 'Brewing & cooking fresh' },
  { key: OrderStatus.READY, title: 'Ready', desc: 'Plated & ready to serve' },
  { key: OrderStatus.SERVED, title: 'Served', desc: 'Delivered to your table' },
];

function PaymentStatusBanner({ paymentParam, order }: { paymentParam: string | null; order: IOrder }) {
  const isPaid = order.payment_status === PaymentStatus.PAID || order.payment_status === PaymentStatus.ADVANCE_PAID;
  const router = useRouter();

  if (isPaid) return null;

  if (paymentParam === 'failed' || paymentParam === 'dismissed') {
    return (
      <div className="mb-4 p-4 rounded-2xl flex items-start gap-3 border"
        style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900 mb-0.5">
            {paymentParam === 'dismissed' ? 'Payment Not Completed' : 'Online Payment Failed'}
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your order <span className="font-mono font-bold">{order.order_number}</span> is confirmed in the kitchen. 
            {' '}Please pay <span className="font-bold">₹{order.total}</span> at the billing counter.
          </p>
        </div>
      </div>
    );
  }

  if (order.payment_status === PaymentStatus.PENDING && !paymentParam) {
    return (
      <div className="mb-4 p-3.5 rounded-xl flex items-center gap-2.5 border text-xs"
        style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}>
        <Receipt className="w-4 h-4 text-green-600 flex-shrink-0" />
        <span className="text-green-800 font-semibold">
          Order confirmed • Please settle ₹{order.total} at counter when done
        </span>
      </div>
    );
  }

  return null;
}

function TrackOrderContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const paymentParam = searchParams.get('payment');

  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Other active orders in this session
  const [sessionOrderIds, setSessionOrderIds] = useState<string[]>([]);
  const [sessionOrders, setSessionOrders] = useState<IOrder[]>([]);
  const [showOtherOrders, setShowOtherOrders] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<IOrder>(`/orders/${orderId}`);
      setOrder(data);
    } catch (err) {
      console.error('Failed to fetch order:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch other orders from this session
  const fetchSessionOrders = async (ids: string[]) => {
    const others = ids.filter((id) => id !== orderId);
    if (others.length === 0) return;
    const fetched: IOrder[] = [];
    for (const id of others) {
      try {
        const o = await apiFetch<IOrder>(`/orders/${id}`);
        fetched.push(o);
      } catch {}
    }
    setSessionOrders(fetched);
  };

  useSocketResync(fetchOrder);

  useEffect(() => {
    fetchOrder();

    // Load session order IDs from localStorage
    try {
      const stored = localStorage.getItem('cp_session_order_ids');
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        setSessionOrderIds(ids);
        fetchSessionOrders(ids);
      }
    } catch {}

    const socket = getSocket();
    const handleStatusChanged = (payload: { orderId: string; newStatus: OrderStatus }) => {
      if (payload.orderId === orderId) {
        setOrder((prev) => (prev ? { ...prev, status: payload.newStatus } : prev));
      }
      // Also update other session orders if matched
      setSessionOrders((prev) =>
        prev.map((o) => (o.id === payload.orderId ? { ...o, status: payload.newStatus } : o)),
      );
    };
    socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleStatusChanged);
    return () => {
      socket.off(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleStatusChanged);
    };
  }, [orderId]);

  const handleOrderMore = () => {
    if (order?.table?.table_number) {
      localStorage.setItem('cp_table_number', String(order.table.table_number));
    }
    if (order?.table?.id) {
      localStorage.setItem('cp_table_id', order.table.id);
    }
    if (order?.session_id) {
      localStorage.setItem('cp_session_id', order.session_id);
    }
    router.push('/menu');
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-canvas max-w-lg mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex justify-between items-center py-3 border-b border-divider/60">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const getStageIndex = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PLACED: return 0;
      case OrderStatus.ACCEPTED: return 1;
      case OrderStatus.PREPARING: return 2;
      case OrderStatus.READY: return 3;
      case OrderStatus.SERVED:
      case OrderStatus.BILLED: return 4;
      default: return 0;
    }
  };

  const currentStageIndex = getStageIndex(order.status);
  const isCancelled = order.status === OrderStatus.CANCELLED;
  const isBilled = order.status === OrderStatus.BILLED;
  const isPaid = order.payment_status === PaymentStatus.PAID || order.payment_status === PaymentStatus.ADVANCE_PAID;
  const isReady = order.status === OrderStatus.READY;
  const isServed = order.status === OrderStatus.SERVED || isBilled;

  const getStatusHeroTitle = () => {
    if (isCancelled) return 'CANCELLED';
    if (isBilled) return 'COMPLETED';
    if (isServed) return 'SERVED';
    if (isReady) return 'READY TO SERVE';
    if (order.status === OrderStatus.PREPARING) return 'PREPARING';
    if (order.status === OrderStatus.ACCEPTED) return 'ACCEPTED';
    return 'ORDER PLACED';
  };

  const getStatusHeroMessage = () => {
    if (isCancelled) return 'This order was vacated or cancelled by café staff.';
    if (isBilled) return 'Thank you for dining at Chai Partner! We hope you loved your meal.';
    if (isServed) return 'Your chais and snacks have arrived at your table. Enjoy!';
    if (isReady) return 'Your dishes are plated hot and fresh. Staff is bringing them to you now.';
    if (order.status === OrderStatus.PREPARING) return 'Your chai is being freshly brewed and snacks are being grilled.';
    if (order.status === OrderStatus.ACCEPTED) return 'The kitchen has acknowledged your ticket and started preparation.';
    return 'Your order has been transmitted directly to the kitchen display.';
  };

  const otherActiveOrders = sessionOrders.filter(
    (o) =>
      o.id !== orderId &&
      o.status !== OrderStatus.CANCELLED &&
      o.status !== OrderStatus.BILLED,
  );

  const allOrdersCompleted = sessionOrders.length > 0 && sessionOrders.every(
    (o) => o.status === OrderStatus.SERVED || o.status === OrderStatus.BILLED || o.status === OrderStatus.CANCELLED
  );

  return (
    <div className="min-h-screen bg-canvas text-ink max-w-lg mx-auto p-4 sm:p-6 pb-28">
      {/* ── Top Header ── */}
      <header className="flex items-center justify-between pb-4 mb-6 border-b border-divider/60">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => router.push('/menu')}
            className="w-8 h-8 rounded-lg bg-canvas-warm border border-gold/30 flex items-center justify-center text-gold-deep shadow-xs hover:bg-gold hover:text-white transition-colors"
            title="Back to Menu"
          >
            <Coffee className="w-4 h-4" strokeWidth={1.8} />
          </button>
          <div>
            <h1
              className="text-base font-serif font-bold text-ink leading-tight"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Order Tracker
            </h1>
            <span className="text-[11px] text-ink-muted">
              Table {order.table?.table_number || '1'} • {order.order_number}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Show other session orders toggle */}
          {otherActiveOrders.length > 0 && (
            <button
              onClick={() => setShowOtherOrders(!showOtherOrders)}
              className="h-8 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold text-amber-800 transition-all shadow-xs inline-flex items-center gap-1.5"
            >
              <List className="w-3.5 h-3.5" />
              <span>{otherActiveOrders.length} more</span>
            </button>
          )}
          <ExitButton />
        </div>
      </header>

      {/* ── Payment Status Banner ── */}
      <PaymentStatusBanner paymentParam={paymentParam} order={order} />

      {/* ── Other Session Orders Panel ── */}
      {showOtherOrders && otherActiveOrders.length > 0 && (
        <section className="mb-5 bg-white border border-divider/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="flex items-center justify-between p-4 border-b border-divider/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-sans">
              Other Active Orders This Session
            </h3>
            <button onClick={() => setShowOtherOrders(false)} className="text-ink-faint hover:text-ink">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-divider/40">
            {otherActiveOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => router.push(`/track/${o.id}`)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-canvas-warm transition-colors text-left"
              >
                <div>
                  <p className="text-xs font-bold text-ink">{o.order_number}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {o.items?.length || 0} items • ₹{o.total}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg"
                    style={{
                      background: o.status === OrderStatus.READY ? '#F0FDF4' : '#FFF4E8',
                      color: o.status === OrderStatus.READY ? '#16A34A' : '#C17B3A',
                      border: `1px solid ${o.status === OrderStatus.READY ? '#86EFAC' : '#F5C580'}`,
                    }}>
                    {o.status}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-ink-faint" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Large Current State Hero ── */}
      <section className="bg-white border border-divider/80 rounded-2xl p-6 shadow-xs mb-5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-pale border border-gold-muted/80 text-[11px] font-bold uppercase tracking-wider text-gold-deep mb-3">
          <span className="w-2 h-2 rounded-full bg-gold-deep pulse-live" />
          <span>Live Kitchen Status</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-ink font-sans mb-1.5">
          {getStatusHeroTitle()}
        </h2>

        <p className="text-xs sm:text-sm text-ink-muted max-w-xs mx-auto leading-relaxed">
          {getStatusHeroMessage()}
        </p>

        {/* Action Button: Order more or view bill */}
        <div className="mt-5 pt-4 border-t border-divider/60 flex items-center justify-center gap-3">
          <span className="text-xs font-mono font-bold text-ink">
            Ticket Total: ₹{order.total}
          </span>
          <span className="text-xs text-ink-faint">•</span>
          <span className={`text-xs font-semibold ${isPaid ? 'text-ok' : 'text-warn'}`}>
            {isPaid ? 'Settled (Paid Online)' : 'Pay at Counter'}
          </span>
        </div>
      </section>

      {/* ── Visual Stepped Progress ── */}
      {!isCancelled && (
        <section className="bg-white border border-divider/80 rounded-2xl p-5 sm:p-6 shadow-xs mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink pb-3 mb-4 border-b border-divider/60 font-sans">
            Preparation Journey
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-divider">
            {STAGES.map((st, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isFuture = idx > currentStageIndex;

              return (
                <div key={st.key} className="relative flex items-start gap-3.5 group">
                  {/* Step Dot */}
                  <div
                    className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isPast
                        ? 'border-ok bg-ok text-white'
                        : isCurrent
                        ? 'border-gold bg-gold-pale text-gold-deep ring-4 ring-gold-pale/80'
                        : 'border-divider bg-white text-transparent'
                    }`}
                  >
                    {isPast && <CheckCircle2 className="w-3 h-3" />}
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-gold-deep" />}
                  </div>

                  {/* Stage Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-xs sm:text-sm font-bold tracking-tight ${
                          isCurrent
                            ? 'text-gold-deep font-extrabold'
                            : isPast
                            ? 'text-ink'
                            : 'text-ink-faint'
                        }`}
                      >
                        {st.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gold-deep px-1.5 py-0.5 rounded bg-gold-pale border border-gold-muted/60">
                          Current Stage
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {st.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Order Items Summary ── */}
      <section className="bg-white border border-divider/80 rounded-2xl p-5 shadow-xs mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-divider/60 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-sans">
            Ticket Items ({order.items?.length || 0})
          </h3>
          <span className="text-xs font-mono font-bold text-ink">
            ₹{order.total}
          </span>
        </div>

        <div className="divide-y divide-divider/40">
          {(order.items || []).map((item, idx) => {
            const qty = (item as any).quantity ?? item.qty ?? 1;
            const price = (item as any).price ?? item.unit_price ?? 0;
            return (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <VegIndicator isVeg={item.veg_flag ?? true} />
                  <span className="font-semibold text-ink truncate">
                    {item.item_name}
                  </span>
                  <span className="font-mono text-ink-faint font-normal">
                    × {qty}
                  </span>
                </div>
                <span className="font-mono font-bold text-ink flex-shrink-0">
                  ₹{(Number(price) * qty).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {order.notes && (
          <div className="mt-3 pt-3 border-t border-divider/60 text-xs text-ink-muted bg-canvas-warm p-2.5 rounded-lg">
            <span className="font-bold text-ink">Note for Chefs:</span> {order.notes}
          </div>
        )}
      </section>

      {/* Bottom Sticky Action: Order More */}
      {!isCancelled && !isBilled && (
        <div className="fixed bottom-4 left-4 right-4 z-30 max-w-lg mx-auto">
          {allOrdersCompleted ? (
            <EndSessionButton />
          ) : (
            <button
              type="button"
              onClick={handleOrderMore}
              className="w-full h-11 bg-gold hover:bg-gold-deep text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add More Items to Table {order.table?.table_number || ''}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas max-w-lg mx-auto p-4 sm:p-6 space-y-4">
        <div className="h-8 w-40 bg-canvas-warm rounded animate-pulse" />
        <div className="h-44 w-full bg-canvas-warm rounded-2xl animate-pulse" />
        <div className="h-64 w-full bg-canvas-warm rounded-2xl animate-pulse" />
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  );
}
