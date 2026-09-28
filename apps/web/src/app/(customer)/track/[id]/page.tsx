'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Receipt,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Flame,
  BellRing,
  Sparkles,
} from 'lucide-react';

const STAGES = [
  { key: OrderStatus.PLACED, title: 'Ordered', desc: 'Sent to counter' },
  { key: OrderStatus.ACCEPTED, title: 'Accepted', desc: 'Kitchen acknowledged' },
  { key: OrderStatus.PREPARING, title: 'Preparing', desc: 'Cooking fresh' },
  { key: OrderStatus.READY, title: 'Ready', desc: 'Ready for table' },
  { key: OrderStatus.SERVED, title: 'Served', desc: 'Enjoy your food' },
];

export default function TrackOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);

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

  // TRD.md §6: Automatic REST Resync upon socket reconnect
  useSocketResync(fetchOrder);

  useEffect(() => {
    fetchOrder();

    const socket = getSocket();
    const handleStatusChanged = (payload: { orderId: string; newStatus: OrderStatus }) => {
      if (payload.orderId === orderId) {
        setOrder((prev) => (prev ? { ...prev, status: payload.newStatus } : prev));
      }
    };

    socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleStatusChanged);
    return () => {
      socket.off(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleStatusChanged);
    };
  }, [orderId]);

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-cream max-w-md mx-auto p-4 space-y-4">
        <div className="flex justify-between items-center py-3 border-b border-cream-dark">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-56 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  const getStageIndex = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PLACED:
        return 0;
      case OrderStatus.ACCEPTED:
        return 1;
      case OrderStatus.PREPARING:
        return 2;
      case OrderStatus.READY:
        return 3;
      case OrderStatus.SERVED:
      case OrderStatus.BILLED:
        return 4;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(order.status);
  const isBilled = order.status === OrderStatus.BILLED;
  const isPaid = order.payment_status === PaymentStatus.PAID;
  const isPreparing = order.status === OrderStatus.PREPARING || order.status === OrderStatus.ACCEPTED;
  const isReady = order.status === OrderStatus.READY;
  const isServed = order.status === OrderStatus.SERVED || isBilled;

  return (
    <div className="min-h-screen bg-cream max-w-md mx-auto p-4 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between py-3 mb-2 border-b border-cream-dark">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-surface border border-terracotta/20 flex items-center justify-center text-terracotta shadow-xs">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-serif font-bold text-coffee">Live Order Tracker</h1>
            <span className="text-[10px] text-sage font-semibold">Table {order.table?.table_number || ''}</span>
          </div>
        </div>

        <span className="px-3 py-1 bg-surface border border-cream-dark rounded-full text-xs font-bold text-coffee shadow-xs">
          {order.order_number}
        </span>
      </header>

      {/* Dynamic Culinary Animation Card */}
      <div className="bg-surface border border-terracotta/15 rounded-3xl p-6 text-center shadow-xs my-4 relative overflow-hidden">
        {/* Steam Animation Area */}
        <div className="relative w-20 h-20 mx-auto mb-3 flex items-center justify-center">
          {/* Aroma waves in preparing state */}
          {isPreparing && (
            <div className="absolute inset-0 rounded-full border-2 border-terracotta/30 aroma-ring pointer-events-none" />
          )}

          {/* Organic Hot Steam trails rising */}
          {(isPreparing || order.status === OrderStatus.PLACED) && (
            <>
              <div className="absolute -top-3 left-5 w-1.5 h-5 bg-terracotta/40 rounded-full animate-steam-1"></div>
              <div className="absolute -top-5 left-9 w-2 h-6 bg-terracotta/55 rounded-full animate-steam-2"></div>
              <div className="absolute -top-3 left-13 w-1.5 h-5 bg-terracotta/40 rounded-full animate-steam-3"></div>
            </>
          )}

          {/* Central Animated Icon Vessel */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-xs ${
              isReady
                ? 'bg-success-light text-success border border-success/30 ring-4 ring-success/10'
                : isServed
                ? 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                : 'bg-cream text-terracotta border border-terracotta/20'
            }`}
          >
            {isReady ? (
              <BellRing className="w-9 h-9 animate-bounce text-success" />
            ) : isServed ? (
              <CheckCircle2 className="w-9 h-9 text-terracotta" />
            ) : isPreparing ? (
              <Coffee className="w-9 h-9 text-terracotta" />
            ) : (
              <Clock className="w-9 h-9 text-amber" />
            )}
          </div>
        </div>

        {/* Dynamic status pill */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${
            isReady
              ? 'bg-success-light border border-success/30 text-success'
              : isServed
              ? 'bg-cream border border-cream-dark text-coffee'
              : 'bg-warning-light border border-warning/30 text-warning'
          }`}
        >
          {isReady ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ready for Serving!</span>
            </>
          ) : isServed ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Served at Table {order.table?.table_number}</span>
            </>
          ) : (
            <>
              <Flame className="w-3.5 h-3.5 text-amber" />
              <span>Brewing Fresh • 15-20 mins</span>
            </>
          )}
        </div>

        <h2 className="text-xl font-serif font-bold text-coffee capitalize">
          {order.status === OrderStatus.PLACED && 'Order Placed at Counter'}
          {order.status === OrderStatus.ACCEPTED && 'Kitchen Accepted Order'}
          {order.status === OrderStatus.PREPARING && 'Kitchen is Cooking'}
          {order.status === OrderStatus.READY && 'Fresh & Ready to Serve!'}
          {order.status === OrderStatus.SERVED && 'Food Served! Enjoy Your Chai'}
          {order.status === OrderStatus.BILLED && 'Order Completed & Billed'}
        </h2>
        <p className="text-xs text-coffee/70 mt-1 max-w-xs mx-auto">
          {isReady
            ? 'Your fresh chai and bites are ready! Staff is delivering them to your table now.'
            : isServed
            ? 'We hope you love your experience at Chai Partner! Let staff know if you need anything else.'
            : `Sit back and relax. Our staff will bring your freshly brewed order directly to Table ${order.table?.table_number}.`}
        </p>
      </div>

      {/* Progress Timeline */}
      <div className="bg-surface border border-terracotta/15 rounded-2xl p-5 shadow-xs mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-sage mb-4">Order Progress</h3>
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-cream-dark">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx <= currentStageIndex;
            const isCurrent = idx === currentStageIndex;

            return (
              <div key={stage.key} className="relative flex items-start gap-3">
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-terracotta text-surface ring-4 ring-cream'
                      : 'bg-surface border-2 border-cream-dark text-coffee/40'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>

                <div>
                  <h4
                    className={`text-xs font-bold ${
                      isCurrent ? 'text-terracotta font-extrabold text-sm' : isCompleted ? 'text-coffee' : 'text-coffee/40'
                    }`}
                  >
                    {stage.title}
                  </h4>
                  <p className="text-[11px] text-coffee/60">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Item Summary */}
      <div className="bg-surface border border-terracotta/15 rounded-2xl p-4 shadow-xs mb-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-cream-dark">
          <span className="text-xs font-bold uppercase tracking-wider text-sage">Item Details</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isPaid
                ? 'bg-success-light text-success border border-success/30'
                : 'bg-warning-light text-warning border border-warning/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-success' : 'bg-warning'}`}
            ></span>
            <span>{isPaid ? '● Advance Paid' : '● Payment Pending at Counter'}</span>
          </span>
        </div>

        <div className="space-y-2 text-xs divide-y divide-cream-dark/50">
          {order.items.map((item) => (
            <div key={item.id} className="pt-2 flex justify-between items-center">
              <div>
                <span className="font-bold text-coffee">
                  {item.qty}x {item.item_name}
                </span>
                <span className="text-[10px] text-coffee/50 block">₹{item.unit_price} each</span>
              </div>
              <span className="font-bold text-coffee">₹{item.unit_price * item.qty}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-cream-dark space-y-1 text-xs">
          <div className="flex justify-between text-coffee/70">
            <span>Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>
          <div className="flex justify-between text-coffee/70">
            <span>GST (5%)</span>
            <span>₹{order.tax}</span>
          </div>
          <div className="flex justify-between text-base font-serif font-bold text-coffee pt-2 border-t border-cream-dark/60">
            <span>Grand Total</span>
            <span className="text-terracotta">₹{order.total}</span>
          </div>
        </div>
      </div>

      {/* Counter settlement instruction if cash pending */}
      {!isPaid && !isBilled && (
        <div className="p-3.5 bg-cream/70 border border-cream-dark rounded-2xl flex items-center gap-3 text-xs text-coffee/80 mb-4">
          <Receipt className="w-5 h-5 text-terracotta flex-shrink-0" />
          <span>
            Payment is pending. Please pay by cash or UPI at the front counter before leaving.
          </span>
        </div>
      )}
    </div>
  );
}
