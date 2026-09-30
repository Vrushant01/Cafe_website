'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import {
  IOrder,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  AdminRole,
  IRefund,
} from '@chai-partner/shared';
import {
  Search,
  Calendar,
  Filter,
  CreditCard,
  Banknote,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  ShieldAlert,
  Receipt,
  Clock,
  User,
  Phone,
  FileText,
} from 'lucide-react';

interface OrderHistoryItem extends IOrder {
  phone_masked?: string;
  payment?: any;
  payment_method?: PaymentMethod;
}

interface HistoryResponse {
  orders: OrderHistoryItem[];
  total: number;
  totalRevenue: number;
  refundedCount: number;
}

export default function AdminOrderHistoryPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [refundedCount, setRefundedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Accordion expanded order ID
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Refund Modal State
  const [refundOrder, setRefundOrder] = useState<OrderHistoryItem | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  // View Existing Refunds Modal State
  const [viewRefundsOrder, setViewRefundsOrder] = useState<OrderHistoryItem | null>(null);
  const [loggedRefunds, setLoggedRefunds] = useState<IRefund[]>([]);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { setHeaderState } = useAdminHeader();
  useEffect(() => {
    setHeaderState({ onRefresh: fetchHistory });
    return () => setHeaderState({});
  }, [setHeaderState]); // Omit fetchHistory from deps

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (range) params.append('range', range);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (methodFilter !== 'all') params.append('payment_method', methodFilter);

      const res = await apiFetch<HistoryResponse>(`/orders/history?${params.toString()}`);
      setOrders(res.orders || []);
      setTotal(res.total || 0);
      setTotalRevenue(res.totalRevenue || 0);
      setRefundedCount(res.refundedCount || 0);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to fetch order history' });
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
    try {
      setCurrentUser(JSON.parse(rawUser));
    } catch {}

    fetchHistory();
  }, [range, statusFilter, methodFilter]);

  // Debounced search trigger
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchHistory();
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const isAdmin = currentUser?.role?.toLowerCase() === AdminRole.ADMIN;
  const isCashier = currentUser?.role?.toLowerCase() === AdminRole.CASHIER;
  const canRefund = isAdmin || isCashier;

  // Open Refund Dialog
  const handleOpenRefundModal = (order: OrderHistoryItem) => {
    setRefundOrder(order);
    setRefundAmount(order.total.toString());
    setRefundReason('');
  };

  // Submit Refund and Cancellation (BRAIN Rule 7)
  const handleSubmitRefund = async () => {
    if (!refundOrder) return;
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setNotification({ type: 'error', message: 'Refund amount must be greater than zero' });
      return;
    }
    if (amount > Number(refundOrder.total)) {
      setNotification({
        type: 'error',
        message: `Refund amount (₹${amount}) cannot exceed order total (₹${refundOrder.total})`,
      });
      return;
    }
    if (!refundReason.trim() || refundReason.trim().length < 3) {
      setNotification({
        type: 'error',
        message: 'A clear reason is mandatory per BRAIN Rule 7 for processing refunds',
      });
      return;
    }

    try {
      setActionLoading(true);
      await apiFetch(`/admin/refunds/cancel-order/${refundOrder.id}`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          reason: refundReason.trim(),
        }),
      });

      setNotification({
        type: 'success',
        message: `Order ${refundOrder.order_number} cancelled and refund of ₹${amount} logged successfully`,
      });
      setRefundOrder(null);
      await fetchHistory();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // View Logged Refunds
  const handleViewRefunds = async (order: OrderHistoryItem) => {
    try {
      setViewRefundsOrder(order);
      const refunds = await apiFetch<IRefund[]>(`/admin/refunds/order/${order.id}`);
      setLoggedRefunds(refunds);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Could not fetch refund records' });
    }
  };

  const formatPaymentMethod = (method?: PaymentMethod) => {
    if (!method) return 'Cash';
    if (method === PaymentMethod.CASH) return 'Cash';
    if (method === PaymentMethod.RAZORPAY) return 'Razorpay / UPI';
    return 'Online';
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.BILLED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-success-light text-success border border-success/30">
            <CheckCircle2 className="w-3 h-3" />
            Billed
          </span>
        );
      case OrderStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-error-light text-error border border-error/30">
            <X className="w-3 h-3" />
            Cancelled
          </span>
        );
      case OrderStatus.READY:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber/15 text-amber border border-amber/30">
            <Clock className="w-3 h-3" />
            Ready
          </span>
        );
      case OrderStatus.PREPARING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber/10 text-terracotta border border-terracotta/25">
            <Clock className="w-3 h-3" />
            Preparing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cream-dark text-coffee">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full pb-20">

      {/* Notification banner */}
      {notification && (
        <div
          className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs ${
            notification.type === 'success'
              ? 'bg-success-light border-success/30 text-success'
              : 'bg-error-light border-error/30 text-error'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        <div className="bg-surface border border-cream-dark/60 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-sage mb-1">Total Orders</div>
          <div className="text-2xl font-serif font-bold text-coffee">{total}</div>
          <div className="text-[11px] text-coffee/60 mt-1">In selected range</div>
        </div>

        <div className="bg-surface border border-cream-dark/60 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-sage mb-1">Total Revenue</div>
          <div className="text-2xl font-serif font-bold text-terracotta">₹{totalRevenue.toLocaleString()}</div>
          <div className="text-[11px] text-coffee/60 mt-1">Paid / Advance paid orders</div>
        </div>

        <div className="bg-surface border border-cream-dark/60 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-sage mb-1">Refunded / Cancelled</div>
          <div className="text-2xl font-serif font-bold text-error">{refundedCount}</div>
          <div className="text-[11px] text-coffee/60 mt-1">Audited with reasons</div>
        </div>
      </section>

      {/* Filters Toolbar */}
      <section className="bg-surface border border-cream-dark/60 rounded-2xl p-4 shadow-xs mb-6 space-y-4">
        {/* Top row: Search input & Status dropdowns */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-coffee/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order #, customer name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-cream/40 border border-cream-dark rounded-xl text-xs text-coffee placeholder-coffee/40 focus:outline-none focus:border-terracotta"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee/40 hover:text-coffee"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-cream/40 border border-cream-dark rounded-xl text-xs font-semibold text-coffee focus:outline-none focus:border-terracotta"
            >
              <option value="all">All Statuses</option>
              <option value={OrderStatus.BILLED}>Billed</option>
              <option value={OrderStatus.CANCELLED}>Cancelled</option>
              <option value={OrderStatus.SERVED}>Served</option>
              <option value={OrderStatus.READY}>Ready</option>
              <option value={OrderStatus.PREPARING}>Preparing</option>
              <option value={OrderStatus.ACCEPTED}>Accepted</option>
              <option value={OrderStatus.PLACED}>Placed</option>
            </select>

            {/* Payment Method Dropdown */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 bg-cream/40 border border-cream-dark rounded-xl text-xs font-semibold text-coffee focus:outline-none focus:border-terracotta"
            >
              <option value="all">All Payment Methods</option>
              <option value={PaymentMethod.CASH}>Cash</option>
              <option value={PaymentMethod.RAZORPAY}>Razorpay / UPI</option>
            </select>
          </div>
        </div>

        {/* Date Range Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="font-bold text-sage uppercase tracking-wider text-[11px] mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Date Range:
          </span>
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
      </section>

      {/* Orders List Table */}
      {loading ? (
        <div className="text-center py-16 text-sage font-medium text-sm">
          Loading order history...
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-cream-dark rounded-2xl">
          <p className="text-sm font-semibold text-coffee/70">No historical orders match your filters.</p>
          <button
            onClick={() => {
              setSearch('');
              setRange('all');
              setStatusFilter('all');
              setMethodFilter('all');
            }}
            className="mt-3 text-xs text-terracotta font-bold underline hover:text-terracotta/80"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const isCancelled = order.status === OrderStatus.CANCELLED;
            const isRefunded = order.payment_status === PaymentStatus.REFUNDED;
            const isPaymentFailed = order.payment_status === PaymentStatus.FAILED;
            const isPendingPayment = order.payment_status === PaymentStatus.PENDING && order.payment_method === 'razorpay';
            const formattedDate = new Date(order.created_at).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <div
                key={order.id}
                className="bg-surface border border-cream-dark/60 rounded-2xl overflow-hidden shadow-xs transition-all hover:border-cream-dark"
              >
                {/* Main Order Row */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Order #, Table, Date, Customer */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-serif font-bold text-coffee text-base">
                        {order.order_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cream text-xs font-bold text-coffee border border-cream-dark">
                        Table {order.table?.table_number || '?'}
                      </span>
                      {getStatusBadge(order.status)}

                      {/* Payment Failed Badge */}
                      {isPaymentFailed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                          ⚠ Payment Failed
                        </span>
                      )}
                      {isPendingPayment && !isPaymentFailed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          ⏳ Payment Pending
                        </span>
                      )}

                      {/* Payment Method Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cream/70 text-coffee/80 border border-cream-dark">
                        {order.payment_method === PaymentMethod.CASH ? (
                          <Banknote className="w-3 h-3 text-sage" />
                        ) : (
                          <CreditCard className="w-3 h-3 text-terracotta" />
                        )}
                        <span>{formatPaymentMethod(order.payment_method)}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-coffee/70 flex-wrap">
                      <span className="flex items-center gap-1 text-sage">
                        <Clock className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-sage" />
                        {order.session?.customer_name || 'Guest'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-sage" />
                        {order.phone_masked || 'Protected'}
                      </span>
                    </div>

                    {/* Quick items preview */}
                    <div className="text-xs text-coffee/80 font-medium">
                      {(order.items || []).map((i) => `${i.qty}x ${i.menu_item?.name || 'Item'}`).join(', ')}
                    </div>
                  </div>

                  {/* Right: Total Amount, Expand button, Refund Action */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-cream-dark/40">
                    <div className="text-right">
                      <div className="font-serif font-bold text-coffee text-lg">
                        ₹{Number(order.total)}
                      </div>
                      <div className="text-[10px] text-sage">incl. 5% GST</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Accordion toggle */}
                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="p-2 bg-cream/50 hover:bg-cream border border-cream-dark rounded-xl text-coffee/70 transition-colors"
                        title={isExpanded ? 'Collapse items' : 'View order details'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {/* Refund / Cancellation Button (BRAIN Rule 7) */}
                      {canRefund && !isCancelled && !isRefunded && (
                        <button
                          onClick={() => handleOpenRefundModal(order)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-error-light hover:bg-error/20 text-error border border-error/30 rounded-xl text-xs font-bold transition-colors"
                          title="Process refund and cancel order"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Cancel & Refund</span>
                        </button>
                      )}

                      {/* View logged refunds if already cancelled/refunded */}
                      {(isCancelled || isRefunded) && (
                        <button
                          onClick={() => handleViewRefunds(order)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-cream/60 hover:bg-cream border border-cream-dark text-coffee rounded-xl text-xs font-semibold transition-colors"
                          title="View logged refund records"
                        >
                          <FileText className="w-3.5 h-3.5 text-sage" />
                          <span>View Refund</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Item Breakdown Accordion */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-cream/30 border-t border-cream-dark/40 animate-in fade-in">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-sage mb-2">
                      Order Line Items (Snapshotted Unit Price)
                    </h4>
                    <div className="space-y-1.5">
                      {(order.items || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs text-coffee py-1 border-b border-cream-dark/20 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-terracotta">{item.qty}x</span>
                            <span>{item.menu_item?.name || 'Menu Item'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-coffee/60 text-[11px]">
                              @ ₹{Number(item.unit_price)} each
                            </span>
                            <span className="font-semibold">
                              ₹{(Number(item.unit_price) * item.qty).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-2 border-t border-cream-dark/40 flex justify-between text-xs text-coffee font-semibold">
                      <span>Subtotal: ₹{Number(order.subtotal)} | 5% GST: ₹{Number(order.tax)}</span>
                      <span className="font-serif font-bold text-sm text-terracotta">
                        Grand Total: ₹{Number(order.total)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Mandatory Refund & Cancellation (BRAIN Rule 7) */}
      {refundOrder && (
        <div className="fixed inset-0 z-50 bg-coffee/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-cream-dark rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-error-light text-error flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-coffee text-base">Process Refund & Cancel</h3>
                  <div className="text-[11px] text-sage font-medium">Order {refundOrder.order_number}</div>
                </div>
              </div>
              <button onClick={() => setRefundOrder(null)} className="p-1 hover:bg-cream rounded-lg">
                <X className="w-4 h-4 text-coffee/60" />
              </button>
            </div>

            {/* Non-Negotiable Rule 7 Notice */}
            <div className="mb-4 p-3 bg-error-light/50 border border-error/25 rounded-xl text-[11px] text-error flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-error" />
              <span>
                <strong>BRAIN.md Rule 7:</strong> Every refund — cash or online — must be logged with amount, reason, and processing staff before the order can be marked cancelled.
              </span>
            </div>

            <div className="space-y-3.5 mb-5 text-xs">
              <div>
                <label className="block font-bold text-sage uppercase tracking-wider mb-1">
                  Refund Amount (₹) * (Order Total: ₹{Number(refundOrder.total)})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-coffee">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={Number(refundOrder.total)}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-cream/40 border border-cream-dark rounded-xl font-bold text-coffee focus:outline-none focus:border-terracotta"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-sage uppercase tracking-wider mb-1">
                  Mandatory Refund Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this order is being cancelled/refunded (e.g. food issue, customer emergency, wrong table selected)..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-cream/40 border border-cream-dark rounded-xl text-coffee focus:outline-none focus:border-terracotta"
                  autoFocus
                ></textarea>
              </div>

              <div className="p-2.5 bg-cream/50 rounded-xl text-[11px] text-coffee/70">
                Processed by: <strong className="text-coffee">{currentUser?.name || 'Staff'}</strong> ({currentUser?.role})
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRefundOrder(null)}
                className="flex-1 py-2.5 bg-cream/60 border border-cream-dark text-coffee rounded-xl text-xs font-bold hover:bg-cream"
              >
                Back
              </button>
              <button
                onClick={handleSubmitRefund}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-error text-cream rounded-xl text-xs font-bold hover:bg-error/90 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Refund & Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: View Logged Refunds for an Order */}
      {viewRefundsOrder && (
        <div className="fixed inset-0 z-50 bg-coffee/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-cream-dark rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-coffee text-base">
                Refund Logs for {viewRefundsOrder.order_number}
              </h3>
              <button onClick={() => setViewRefundsOrder(null)} className="p-1 hover:bg-cream rounded-lg">
                <X className="w-4 h-4 text-coffee/60" />
              </button>
            </div>

            {loggedRefunds.length === 0 ? (
              <p className="text-xs text-coffee/60 py-4 text-center">No refund records found.</p>
            ) : (
              <div className="space-y-3 mb-5 max-h-60 overflow-y-auto">
                {loggedRefunds.map((ref) => (
                  <div key={ref.id} className="p-3 bg-cream/40 border border-cream-dark rounded-xl text-xs">
                    <div className="flex justify-between items-center mb-1 font-bold">
                      <span className="text-error">Refund Amount: ₹{Number(ref.amount)}</span>
                      <span className="text-[10px] text-sage">
                        {new Date(ref.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-coffee mb-1">
                      <strong>Reason:</strong> {ref.reason}
                    </div>
                    <div className="text-[11px] text-sage">
                      Processed By: <strong className="text-coffee">{ref.processed_by}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setViewRefundsOrder(null)}
              className="w-full py-2.5 bg-coffee text-cream rounded-xl text-xs font-bold hover:bg-coffee/90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
