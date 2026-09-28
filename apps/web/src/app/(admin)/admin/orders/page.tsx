'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getSocket, useSocketResync } from '@/lib/socket';
import { AdminHeader } from '@/components/admin/AdminHeader';
import {
  IOrder,
  ITable,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  TableStatus,
  SOCKET_EVENTS,
} from '@chai-partner/shared';
import {
  Coffee,
  Clock,
  Printer,
  CheckCircle,
  AlertCircle,
  ChefHat,
  Receipt,
  User,
  LogOut,
  RefreshCw,
  BellRing,
  Volume2,
  VolumeX,
  X,
  ShieldAlert,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [tables, setTables] = useState<ITable[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals state
  const [kotOrder, setKotOrder] = useState<IOrder | null>(null);
  const [settleOrder, setSettleOrder] = useState<IOrder | null>(null);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [vacateTable, setVacateTable] = useState<ITable | null>(null);
  const [vacateReason, setVacateReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Play a pleasant cafe bell chime using Web Audio API
  const playChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch {}
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [queueData, tablesData] = await Promise.all([
        apiFetch<IOrder[]>('/orders/queue'),
        apiFetch<ITable[]>('/tables'),
      ]);
      setOrders(queueData);
      setTables(tablesData);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to fetch queue data');
    } finally {
      setLoading(false);
    }
  };

  // TRD.md §6: Automatic full REST Resync upon socket reconnect
  useSocketResync(fetchData);

  useEffect(() => {
    const rawUser = localStorage.getItem('cp_admin_user');
    if (!rawUser) {
      router.push('/admin/login');
      return;
    }
    setCurrentUser(JSON.parse(rawUser));

    fetchData();

    // Socket.io Real-Time connection
    const socket = getSocket();
    socket.emit('join_room', 'admin');

    const handleNewOrder = (payload: { order: IOrder }) => {
      setOrders((prev) => {
        // Ensure no duplicates
        if (prev.some((o) => o.id === payload.order.id)) return prev;
        return [...prev, payload.order];
      });
      playChime();
    };

    const handleStatusChanged = (payload: { orderId: string; newStatus: OrderStatus }) => {
      setOrders((prev) =>
        prev
          .map((o) => (o.id === payload.orderId ? { ...o, status: payload.newStatus } : o))
          .filter((o) => o.status !== OrderStatus.BILLED && o.status !== OrderStatus.CANCELLED),
      );
    };

    const handleTableStatusChanged = (payload: { tableId: string; status: TableStatus }) => {
      setTables((prev) =>
        prev.map((t) => (t.id === payload.tableId ? { ...t, status: payload.status } : t)),
      );
    };

    const handleAdminAlert = (alert: any) => {
      playChime();
      alert(`[Floor Notification] ${alert.title}: ${alert.message}`);
    };

    socket.on(SOCKET_EVENTS.ORDER_NEW, handleNewOrder);
    socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleStatusChanged);
    socket.on(SOCKET_EVENTS.TABLE_STATUS_CHANGED, handleTableStatusChanged);
    socket.on('admin:alert', handleAdminAlert);

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_NEW, handleNewOrder);
      socket.off(SOCKET_EVENTS.ORDER_STATUS_CHANGED, handleStatusChanged);
      socket.off(SOCKET_EVENTS.TABLE_STATUS_CHANGED, handleTableStatusChanged);
      socket.off('admin:alert', handleAdminAlert);
    };
  }, []);

  const handleGuardedTransition = async (
    orderId: string,
    expectedCurrent: OrderStatus,
    newStatus: OrderStatus,
  ) => {
    try {
      setActionLoading(true);
      setErrorBanner(null);
      await apiFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          expected_status: expectedCurrent,
          new_status: newStatus,
        }),
      });
      await fetchData();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettleOrder = async () => {
    if (!settleOrder) return;
    try {
      setActionLoading(true);
      setErrorBanner(null);
      await apiFetch(`/orders/${settleOrder.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({ payment_method: settleMethod }),
      });
      setSettleOrder(null);
      await fetchData();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceVacate = async () => {
    if (!vacateTable || !vacateReason.trim()) return;
    try {
      setActionLoading(true);
      setErrorBanner(null);
      await apiFetch(`/tables/${vacateTable.id}/force-vacate`, {
        method: 'POST',
        body: JSON.stringify({ reason: vacateReason.trim() }),
      });
      setVacateTable(null);
      setVacateReason('');
      await fetchData();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  const handleLogout = () => {
    localStorage.removeItem('cp_admin_token');
    localStorage.removeItem('cp_admin_user');
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-cream p-4 md:p-6 pb-20">
      <AdminHeader
        activeTab="orders"
        onRefresh={fetchData}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      {errorBanner && (
        <div className="mb-4 p-3 bg-error-light border border-error/30 rounded-xl text-xs font-bold text-error flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="p-1 hover:bg-error/10 rounded-md">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Floor Overview */}
      <section className="bg-surface border border-terracotta/15 rounded-2xl p-4 shadow-xs mb-6 no-print">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-success pulse-live"></span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-sage">Floor Status (25 Tables)</h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-success">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              {tables.filter((t) => t.status === TableStatus.AVAILABLE).length} Available
            </span>
            <span className="flex items-center gap-1 text-error">
              <span className="w-2 h-2 rounded-full bg-error"></span>
              {tables.filter((t) => t.status === TableStatus.OCCUPIED).length} Occupied
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-13 gap-1.5">
          {tables.map((t) => {
            const isOcc = t.status === TableStatus.OCCUPIED;
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (isOcc) setVacateTable(t);
                }}
                className={`p-2 rounded-xl text-center border transition-all ${
                  isOcc
                    ? 'bg-error-light border-error/30 text-error hover:border-error'
                    : 'bg-cream/40 border-cream-dark text-coffee/80'
                }`}
                title={isOcc ? `Table ${t.table_number} Occupied - Click to Force Vacate` : `Table ${t.table_number} Available`}
              >
                <div className="text-[11px] font-bold">T{t.table_number}</div>
                <div className="text-[9px] font-semibold">{t.seat_count}s</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Order Queue (Oldest First) */}
      <section className="no-print">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-coffee">Live Kitchen & Billing Queue</h2>
            <p className="text-xs text-sage font-medium">Sorted oldest first (FIFO order)</p>
          </div>
          <span className="px-3 py-1 bg-surface border border-cream-dark rounded-full text-xs font-bold text-coffee">
            {orders.length} Active Orders
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-surface rounded-2xl h-56 animate-pulse border border-cream-dark"></div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-surface border border-terracotta/15 rounded-3xl p-12 text-center shadow-xs">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
            <h3 className="text-base font-bold text-coffee">All Caught Up!</h3>
            <p className="text-xs text-coffee/60 mt-1">No pending orders in the kitchen queue right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => {
              const isAdvancePaid =
                order.payment_status === PaymentStatus.ADVANCE_PAID ||
                order.payment_status === PaymentStatus.PAID;
              const timeAgo = Math.max(
                0,
                Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000),
              );

              return (
                <div
                  key={order.id}
                  className="bg-surface border border-terracotta/20 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-cream-dark">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-terracotta text-surface rounded-md text-xs font-bold">
                            Table {order.table?.table_number}
                          </span>
                          <span className="text-xs font-bold text-coffee">{order.order_number}</span>
                        </div>
                        <span className="text-[11px] text-coffee/60 font-medium block mt-1">
                          {order.session?.customer_name || 'Guest'} • {timeAgo === 0 ? 'Just now' : `${timeAgo}m ago`}
                        </span>
                      </div>

                      {/* Payment Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isAdvancePaid
                            ? 'bg-success-light text-success border-success/30'
                            : 'bg-error-light text-error border-error/30'
                        }`}
                      >
                        {isAdvancePaid ? '● Advance Paid' : '● Payment Pending'}
                      </span>
                    </div>

                    {/* Order Items */}
                    <div className="py-3 space-y-1.5 text-xs">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <span className="font-bold text-coffee">
                            <span className="text-terracotta font-extrabold">{item.qty}x</span>{' '}
                            {item.item_name}
                          </span>
                          <span className="text-coffee/60">₹{item.unit_price * item.qty}</span>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="p-2 mb-3 bg-warning-light/50 border border-warning/20 rounded-lg text-[11px] text-coffee/80">
                        <strong className="text-warning">Note:</strong> {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-cream-dark">
                    <div className="flex justify-between items-center text-xs font-bold text-coffee mb-3">
                      <span>Total (inc. GST)</span>
                      <span className="text-sm text-terracotta">₹{Number(order.total).toFixed(2)}</span>
                    </div>

                    {/* 4-Stage Action Buttons */}
                    <div className="space-y-1.5">
                      {order.status === OrderStatus.PLACED && (
                        <button
                          onClick={() =>
                            handleGuardedTransition(order.id, OrderStatus.PLACED, OrderStatus.ACCEPTED)
                          }
                          disabled={actionLoading}
                          className="w-full py-2.5 px-3 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Accept Order</span>
                        </button>
                      )}

                      {order.status === OrderStatus.ACCEPTED && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setKotOrder(order);
                            }}
                            className="py-2.5 px-2 bg-cream hover:bg-cream-dark border border-terracotta/30 text-coffee rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5 text-terracotta" />
                            <span>Print KOT</span>
                          </button>
                          <button
                            onClick={() =>
                              handleGuardedTransition(
                                order.id,
                                OrderStatus.ACCEPTED,
                                OrderStatus.PREPARING,
                              )
                            }
                            disabled={actionLoading}
                            className="py-2.5 px-2 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Start Cooking</span>
                          </button>
                        </div>
                      )}

                      {order.status === OrderStatus.PREPARING && (
                        <button
                          onClick={() =>
                            handleGuardedTransition(
                              order.id,
                              OrderStatus.PREPARING,
                              OrderStatus.READY,
                            )
                          }
                          disabled={actionLoading}
                          className="w-full py-2.5 px-3 bg-success hover:opacity-90 text-surface rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark Food Ready</span>
                        </button>
                      )}

                      {(order.status === OrderStatus.READY || order.status === OrderStatus.SERVED) && (
                        <div className="space-y-1.5">
                          {order.status === OrderStatus.READY && (
                            <button
                              onClick={() =>
                                handleGuardedTransition(
                                  order.id,
                                  OrderStatus.READY,
                                  OrderStatus.SERVED,
                                )
                              }
                              disabled={actionLoading}
                              className="w-full py-2 px-3 bg-cream hover:bg-cream-dark border border-terracotta/30 text-coffee rounded-xl font-bold text-xs transition-colors"
                            >
                              Mark Served to Table
                            </button>
                          )}
                          <button
                            onClick={() => setSettleOrder(order)}
                            disabled={actionLoading}
                            className="w-full py-2.5 px-3 bg-coffee hover:bg-coffee-light text-surface rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Receipt className="w-4 h-4 text-warning" />
                            <span>Settle Bill & Free Table</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Settle Bill Modal */}
      {settleOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-surface border border-terracotta/20 rounded-3xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-serif font-bold text-coffee mb-1">
              Settle Table {settleOrder.table?.table_number} Bill
            </h3>
            <p className="text-xs text-coffee/70 mb-4">
              Order {settleOrder.order_number} • Total ₹{Number(settleOrder.total).toFixed(2)}
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-coffee uppercase">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleMethod(PaymentMethod.CASH)}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    settleMethod === PaymentMethod.CASH
                      ? 'border-terracotta bg-cream text-coffee ring-1 ring-terracotta'
                      : 'border-cream-dark bg-surface text-coffee/60'
                  }`}
                >
                  Cash Received
                </button>
                <button
                  type="button"
                  onClick={() => setSettleMethod(PaymentMethod.ONLINE)}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    settleMethod === PaymentMethod.ONLINE
                      ? 'border-terracotta bg-cream text-coffee ring-1 ring-terracotta'
                      : 'border-cream-dark bg-surface text-coffee/60'
                  }`}
                >
                  Online / QR Paid
                </button>
              </div>
            </div>

            <p className="text-[11px] text-coffee/60 mb-5 leading-relaxed bg-cream p-2.5 rounded-xl border border-cream-dark">
              ⚠️ Settlement will mark the order as <strong>Billed</strong>, formally close the customer session,
              and <strong>free Table {settleOrder.table?.table_number}</strong> for the next customer.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setSettleOrder(null)}
                className="flex-1 py-2.5 bg-cream hover:bg-cream-dark text-coffee rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSettleOrder}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-bold text-xs"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Vacate Table Modal */}
      {vacateTable && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-surface border border-terracotta/20 rounded-3xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-10 h-10 bg-error-light rounded-xl flex items-center justify-center text-error mb-3">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-serif font-bold text-coffee mb-1">
              Force Vacate Table {vacateTable.table_number}
            </h3>
            <p className="text-xs text-coffee/70 mb-4">
              Manual override (BRAIN Rule 6 & 9). This action will terminate any active session and log an audit trail.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-coffee mb-1.5 uppercase">
                Mandatory Reason <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={vacateReason}
                onChange={(e) => setVacateReason(e.target.value)}
                placeholder="e.g. Guest left without ordering, app crash"
                className="w-full p-2.5 bg-cream/40 border border-cream-dark rounded-xl text-xs text-coffee focus:outline-none focus:ring-2 focus:ring-terracotta"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setVacateTable(null)}
                className="flex-1 py-2.5 bg-cream hover:bg-cream-dark text-coffee rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleForceVacate}
                disabled={actionLoading || !vacateReason.trim()}
                className="flex-1 py-2.5 bg-error hover:opacity-90 text-surface rounded-xl font-bold text-xs disabled:opacity-50"
              >
                Confirm Vacate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KOT Print Dialog Modal */}
      {kotOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-surface border border-terracotta/20 rounded-3xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-serif font-bold text-coffee mb-2">Kitchen Order Ticket (KOT)</h3>
            <div className="border border-dashed border-coffee/30 p-4 bg-white rounded-xl mb-4 font-mono text-xs text-black">
              <div className="text-center font-bold text-sm">CHAI PARTNER</div>
              <div className="text-center text-[10px] mb-2">*** KITCHEN ORDER TICKET ***</div>
              <div>Table: <strong>TABLE {kotOrder.table?.table_number}</strong></div>
              <div>Order: {kotOrder.order_number}</div>
              <div>Time: {new Date(kotOrder.created_at).toLocaleTimeString()}</div>
              <div>Guest: {kotOrder.session?.customer_name}</div>
              <div className="border-t border-black my-2"></div>
              {kotOrder.items.map((i) => (
                <div key={i.id} className="flex justify-between font-bold text-xs py-0.5">
                  <span>{i.qty} x {i.item_name}</span>
                </div>
              ))}
              {kotOrder.notes && (
                <div className="mt-2 text-[10px] italic">
                  Note: {kotOrder.notes}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setKotOrder(null)}
                className="flex-1 py-2.5 bg-cream hover:bg-cream-dark text-coffee rounded-xl font-bold text-xs"
              >
                Close
              </button>
              <button
                onClick={triggerBrowserPrint}
                className="flex-1 py-2.5 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Dialog</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable KOT Area (visible only during window.print()) */}
      {kotOrder && (
        <div id="kot-printable" className="hidden">
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>CHAI PARTNER</div>
          <div style={{ textAlign: 'center', fontSize: '12px', marginBottom: '8px' }}>*** KITCHEN ORDER TICKET ***</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>TABLE {kotOrder.table?.table_number}</div>
          <div>KOT: {kotOrder.order_number}</div>
          <div>Time: {new Date(kotOrder.created_at).toLocaleTimeString()}</div>
          <div>Guest: {kotOrder.session?.customer_name}</div>
          <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>
          {kotOrder.items.map((i) => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', margin: '4px 0' }}>
              <span>{i.qty} x {i.item_name}</span>
            </div>
          ))}
          {kotOrder.notes && (
            <div style={{ marginTop: '8px', fontSize: '11px' }}>
              Note: {kotOrder.notes}
            </div>
          )}
          <div style={{ borderTop: '1px dashed black', margin: '8px 0' }}></div>
        </div>
      )}
    </div>
  );
}
