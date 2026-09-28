'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getSocket, useSocketResync } from '@/lib/socket';
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
      <div className="min-h-screen max-w-md mx-auto p-6 flex flex-col items-center justify-center text-center">
        <Coffee className="w-10 h-10 text-terracotta animate-bounce mb-3" />
        <h2 className="text-lg font-bold text-coffee">Locating Your Order...</h2>
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

  return (
    <div className="min-h-screen bg-cream max-w-md mx-auto p-4 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between py-3 mb-2 border-b border-cream-dark">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-surface border border-terracotta/20 flex items-center justify-center text-terracotta">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-serif font-bold text-coffee">Live Order Tracker</h1>
            <span className="text-[10px] text-sage font-semibold">Table {order.table?.table_number || ''}</span>
          </div>
        </div>

        <span className="px-3 py-1 bg-surface border border-cream-dark rounded-full text-xs font-bold text-coffee">
          {order.order_number}
        </span>
      </header>

      {/* Cooking Animation Card */}
      <div className="bg-surface border border-terracotta/15 rounded-3xl p-6 text-center shadow-xs my-4">
        {/* Steam Animation Elements */}
        <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
          <div className="absolute -top-3 left-4 w-1.5 h-4 bg-terracotta/40 rounded-full animate-steam-1"></div>
          <div className="absolute -top-4 left-7 w-1.5 h-5 bg-terracotta/50 rounded-full animate-steam-2"></div>
          <div className="absolute -top-3 left-10 w-1.5 h-4 bg-terracotta/40 rounded-full animate-steam-3"></div>
          <div className="w-14 h-14 bg-cream rounded-2xl flex items-center justify-center text-terracotta border border-terracotta/20 shadow-xs">
            <Coffee className="w-8 h-8" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-warning-light border border-warning/30 rounded-full text-xs font-bold text-warning mb-2">
          <Clock className="w-3.5 h-3.5" />
          <span>Estimated wait: 20-25 mins</span>
        </div>

        <h2 className="text-xl font-serif font-bold text-coffee capitalize">
          {order.status === OrderStatus.PLACED && 'Order Received'}
          {order.status === OrderStatus.ACCEPTED && 'Kitchen Accepted Order'}
          {order.status === OrderStatus.PREPARING && 'Kitchen is Cooking'}
          {order.status === OrderStatus.READY && 'Food is Ready!'}
          {order.status === OrderStatus.SERVED && 'Food Served! Enjoy'}
          {order.status === OrderStatus.BILLED && 'Order Completed & Billed'}
        </h2>
        <p className="text-xs text-coffee/70 mt-1">
          Sit back and relax. Our staff will bring your freshly brewed order directly to Table{' '}
          {order.table?.table_number}.
        </p>
      </div>

      {/* Progress Timeline */}
      <div className="bg-surface border border-terracotta/15 rounded-2xl p-5 shadow-xs mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-sage mb-4">Live Timeline</h3>
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
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isPaid
                ? 'bg-success-light text-success border border-success/30'
                : 'bg-warning-light text-warning border border-warning/30'
            }`}
          >
            {isPaid ? 'Advance Paid' : 'Payment Pending at Counter'}
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
            <span>₹{Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-coffee/70">
            <span>GST (5%)</span>
            <span>₹{Number(order.tax).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-coffee pt-1">
            <span>Grand Total</span>
            <span className="text-terracotta">₹{Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Reorder Button */}
      <button
        onClick={() => router.push('/menu')}
        className="w-full py-3 px-4 bg-cream hover:bg-cream-dark text-coffee border border-terracotta/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors mb-4 shadow-xs"
      >
        <RotateCcw className="w-4 h-4 text-terracotta" />
        <span>Order More Items to Table {order.table?.table_number}</span>
      </button>

      {/* Cancellation / Help Info */}
      <div className="p-3.5 bg-cream/60 border border-terracotta/20 rounded-xl text-xs text-coffee/70 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-terracotta flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-coffee block mb-0.5">Need to cancel or adjust items?</span>
          <span>
            Please speak directly with the cashier at the counter. All advance payments will be logged and
            refunded by staff.
          </span>
        </div>
      </div>
    </div>
  );
}
