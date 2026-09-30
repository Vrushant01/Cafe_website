'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { IOrder, OrderStatus, PaymentStatus } from '@chai-partner/shared';
import {
  ArrowLeft,
  ShoppingBag,
  Receipt,
  Coffee,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { getSocket, useSocketResync } from '@/lib/socket';
import { ExitButton } from '@/components/ui/ExitButton';
import { EndSessionButton } from '@/components/ui/EndSessionButton';

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessionOrders = async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem('cp_session_order_ids');
      if (!stored) {
        setOrders([]);
        return;
      }
      const ids: string[] = JSON.parse(stored);
      if (!ids.length) {
        setOrders([]);
        return;
      }

      const fetched: IOrder[] = [];
      for (const id of ids) {
        try {
          const o = await apiFetch<IOrder>(`/orders/${id}`);
          fetched.push(o);
        } catch (err) {
          console.error('Failed to fetch order', id, err);
        }
      }
      
      // Sort newest first
      fetched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(fetched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [tableNumber, setTableNumber] = useState<string>('');

  useEffect(() => {
    fetchSessionOrders();
    setTableNumber(localStorage.getItem('cp_table_number') || '');

    const socket = getSocket();
    const handleStatusChanged = (payload: { orderId: string; newStatus: OrderStatus }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === payload.orderId ? { ...o, status: payload.newStatus } : o)),
      );
    };
    socket.on('orderStatusChanged', handleStatusChanged);
    return () => {
      socket.off('orderStatusChanged', handleStatusChanged);
    };
  }, []);

  useSocketResync(fetchSessionOrders);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PLACED: return 'text-ink-muted bg-canvas-warm border-divider';
      case OrderStatus.ACCEPTED: return 'text-gold-deep bg-gold-pale border-gold-muted';
      case OrderStatus.PREPARING: return 'text-amber-700 bg-amber-50 border-amber-200';
      case OrderStatus.READY: return 'text-green-700 bg-green-50 border-green-200';
      case OrderStatus.SERVED: return 'text-emerald-800 bg-emerald-100 border-emerald-300';
      default: return 'text-ink bg-canvas border-divider';
    }
  };

  const allOrdersCompleted = orders.length > 0 && orders.every(
    (o) => o.status === OrderStatus.SERVED || o.status === OrderStatus.BILLED || o.status === OrderStatus.CANCELLED
  );

  return (
    <main className="min-h-screen bg-canvas font-sans pb-24">
      {/* ── Compact Header ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-divider/70 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/menu')}
              className="w-10 h-10 rounded-xl bg-canvas-warm border border-divider flex items-center justify-center text-ink-muted hover:text-ink hover:bg-canvas transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-serif font-bold text-ink text-lg leading-tight" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                My Orders
              </h1>
              <p className="text-[11px] text-ink-muted">Table {tableNumber} · Active session</p>
            </div>
          </div>
          <div className="flex-shrink-0">
             <ExitButton />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {!loading && orders.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-divider bg-white shadow-sm flex flex-col items-center text-center">
            {allOrdersCompleted ? (
              <>
                <p className="text-sm font-semibold text-ink mb-1">All orders have been served.</p>
                <p className="text-xs text-ink-muted mb-4">Your dining session is ready to end.</p>
                <EndSessionButton />
              </>
            ) : (
              <p className="text-sm font-medium text-ink-muted">Your dining session will be available to end once all orders are served.</p>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-divider"></div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 rounded-full bg-canvas-warm flex items-center justify-center mx-auto mb-4 border border-divider">
              <Receipt className="w-8 h-8 text-ink-faint" />
            </div>
            <h2 className="text-lg font-serif font-bold text-ink mb-2">No Orders Yet</h2>
            <p className="text-sm text-ink-muted mb-6">You haven't placed any orders in this session.</p>
            <button
              onClick={() => router.push('/menu')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-white font-bold rounded-xl shadow-sm hover:bg-gold-deep transition-all active:scale-95"
            >
              <Coffee className="w-4 h-4" />
              <span>Browse Menu</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => router.push(`/track/${order.id}`)}
                className="w-full text-left bg-white border border-divider rounded-2xl p-4 shadow-xs hover:border-gold/50 hover:shadow-sm transition-all active:scale-[0.99] group flex flex-col"
              >
                <div className="flex items-start justify-between mb-3 w-full">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-ink bg-canvas-warm px-2 py-0.5 rounded border border-divider">
                        {order.order_number}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-faint">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-serif font-bold text-ink text-base block">₹{order.total}</span>
                    <span className="text-[10px] text-ink-faint font-medium">
                      {order.items.reduce((acc: number, item: any) => acc + (item.quantity ?? item.qty ?? 0), 0)} items
                    </span>
                  </div>
                </div>

                <div className="w-full border-t border-divider-subtle pt-3 flex items-center justify-between">
                  <p className="text-xs text-ink-muted truncate pr-4">
                    {order.items.map((i: any) => `${i.quantity ?? i.qty ?? 0}x ${i.item_name || i.menu_item?.name || 'Item'}`).join(', ')}
                  </p>
                  <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-gold transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}

            <div className="pt-6">
              <button
                onClick={() => router.push('/menu')}
                className="w-full h-12 flex items-center justify-center gap-2 bg-canvas-warm border border-divider rounded-xl font-semibold text-ink text-sm hover:bg-canvas transition-colors active:scale-95"
              >
                <ShoppingBag className="w-4 h-4 text-ink-muted" />
                <span>Order More Items</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
