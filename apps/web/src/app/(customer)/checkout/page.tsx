'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { apiFetch } from '@/lib/api';
import { PaymentMethod, IOrder } from '@chai-partner/shared';
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  Banknote,
  FileText,
  Loader2,
  AlertCircle,
  Coffee,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { VegIndicator } from '@/components/ui/Badge';
import { ExitButton } from '@/components/ui/ExitButton';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, addItem, removeItem, clearCart, subtotal, tax, grandTotal } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);

  const [tableNumber, setTableNumber] = useState('1');
  const [customerName, setCustomerName] = useState('Guest');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTable = localStorage.getItem('cp_table_number');
      const storedName = localStorage.getItem('cp_customer_name');
      if (storedTable) setTableNumber(storedTable);
      if (storedName) setCustomerName(storedName);
    }
  }, []);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-canvas text-ink max-w-md mx-auto p-6 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-white border border-divider shadow-xs flex items-center justify-center mx-auto mb-4 text-gold-deep">
          <Receipt className="w-7 h-7" strokeWidth={1.8} />
        </div>
        <h2
          className="text-xl sm:text-2xl font-serif font-bold text-ink mb-1.5"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          Your Cart is Empty
        </h2>
        <p className="text-xs sm:text-sm text-ink-muted mb-6 max-w-xs leading-relaxed">
          You haven't added any chais or snacks yet. Return to the menu to explore handcrafted specials.
        </p>
        <button
          onClick={() => router.push('/menu')}
          className="h-10 px-6 bg-gold hover:bg-gold-deep text-white rounded-xl font-bold text-xs shadow-xs transition-all"
        >
          Return to Café Menu
        </button>
      </div>
    );
  }

  /**
   * Appends the new order ID to the session's order history in localStorage.
   * This lets the track page show all active orders for this session.
   */
  const recordOrderInSession = (orderId: string) => {
    try {
      const existing = localStorage.getItem('cp_session_order_ids');
      const orderIds: string[] = existing ? JSON.parse(existing) : [];
      if (!orderIds.includes(orderId)) {
        orderIds.push(orderId);
        localStorage.setItem('cp_session_order_ids', JSON.stringify(orderIds));
      }
    } catch {}
  };

  const handlePlaceOrder = async () => {
    setPaymentFailed(false);
    try {
      setLoading(true);
      setError(null);

      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const payload = {
        items: items.map((i) => ({ menu_item_id: i.id, qty: i.qty })),
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      };

      const order = await apiFetch<IOrder>('/orders', {
        method: 'POST',
        idempotencyKey,
        body: JSON.stringify(payload),
      });

      // Record order ID in session history before redirecting
      recordOrderInSession(order.id);

      if (paymentMethod === PaymentMethod.RAZORPAY) {
        try {
          const rzpData = await apiFetch<{
            razorpay_order_id: string;
            amount: number;
            currency: string;
            key_id: string;
            order_number: string;
          }>('/payments/razorpay/order', {
            method: 'POST',
            body: JSON.stringify({ order_id: order.id }),
          });

          const isLoaded = await loadRazorpayScript();
          const isPlaceholder = rzpData.key_id.includes('placeholder');

          if (isLoaded && !isPlaceholder && (window as any).Razorpay) {
            const customerNameStored = localStorage.getItem('cp_customer_name') || 'Guest';
            const options = {
              key: rzpData.key_id,
              amount: rzpData.amount,
              currency: rzpData.currency,
              name: 'Chai Partner',
              description: `Order ${order.order_number}`,
              order_id: rzpData.razorpay_order_id,
              prefill: { name: customerNameStored },
              theme: { color: '#C17B3A' },
              handler: async (response: any) => {
                // Payment SUCCESS handler
                try {
                  await apiFetch('/payments/razorpay/verify', {
                    method: 'POST',
                    body: JSON.stringify({
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                    }),
                  });
                } catch (verifyErr) {
                  // Verification failed on client side; webhook will reconcile
                  console.warn('Client verification note:', verifyErr);
                } finally {
                  clearCart();
                  router.push(`/track/${order.id}?payment=success`);
                }
              },
              modal: {
                // User DISMISSED the payment modal without paying
                ondismiss: () => {
                  // Do NOT clear cart - order exists but payment was not completed.
                  // Navigate to tracking page showing "payment pending" state.
                  // The order is in DB with payment_status=PENDING.
                  router.push(`/track/${order.id}?payment=dismissed`);
                },
              },
            };

            const rzpInstance = new (window as any).Razorpay(options);

            rzpInstance.on('payment.failed', async (response: any) => {
              console.warn('[Razorpay] Payment failed:', response.error);
              // Record failure in backend so it appears in admin history
              try {
                await apiFetch('/payments/razorpay/failed', {
                  method: 'POST',
                  body: JSON.stringify({
                    order_id: order.id,
                    error_code: response.error?.code,
                    error_description: response.error?.description,
                  }),
                });
              } catch {}
              // Don't clear cart — they may want to retry or pay at counter
              router.push(`/track/${order.id}?payment=failed`);
            });

            rzpInstance.open();
            setLoading(false);
            return;
          } else {
            // Mock/dev mode: simulate successful payment
            await apiFetch('/payments/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: rzpData.razorpay_order_id,
                razorpay_payment_id: `mock_pay_${Date.now()}`,
                razorpay_signature: 'mock_valid_signature',
              }),
            });
            clearCart();
            router.push(`/track/${order.id}?payment=success`);
            return;
          }
        } catch (rzpErr: any) {
          // Failed to even create the Razorpay order — fallback gracefully
          // Order is placed, but payment not initiated. Show as pending.
          router.push(`/track/${order.id}?payment=failed`);
          return;
        }
      }

      // Cash at Counter — always succeeds on placement
      clearCart();
      router.push(`/track/${order.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please review your cart.');
    } finally {
      setLoading(false);
    }
  };

  const cgst = (Number(tax) / 2).toFixed(2);
  const sgst = (Number(tax) / 2).toFixed(2);

  return (
    <div className="min-h-screen bg-canvas text-ink pb-36 max-w-xl mx-auto p-4 sm:p-6">
      {/* ── Top Header ── */}
      <header className="flex items-center justify-between pb-4 mb-6 border-b border-divider/60">
        <button
          type="button"
          onClick={() => router.push('/menu')}
          className="w-9 h-9 rounded-lg bg-white border border-divider/70 flex items-center justify-center text-ink hover:text-gold-deep transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <h1
            className="text-base font-serif font-bold text-ink leading-tight"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Review Your Order
          </h1>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Table {tableNumber} • Guest: <span className="font-semibold text-ink">{customerName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearCart}
            title="Clear Entire Cart"
            className="w-9 h-9 rounded-lg bg-white border border-divider/70 flex items-center justify-center text-danger hover:bg-danger-bg transition-all shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ExitButton />
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="mb-5 p-3.5 bg-danger-bg border border-danger-border rounded-xl flex items-center gap-2.5 text-xs font-semibold text-danger">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Payment Failed Alert */}
      {paymentFailed && (
        <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800">Online payment not completed</p>
            <p className="text-amber-700 mt-0.5 leading-relaxed">
              Your order is placed but payment was not captured. You can pay at the counter, or try placing a new order with online payment.
            </p>
          </div>
        </div>
      )}

      {/* ── Section 1: Selected Dishes & Quantities ── */}
      <section className="bg-white border border-divider/80 rounded-2xl p-4 sm:p-5 shadow-xs mb-4">
        <div className="flex items-center justify-between pb-3 border-b border-divider/60 mb-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink font-sans">
            Ordered Selections
          </h2>
          <span className="text-xs font-mono text-ink-faint">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="divide-y divide-divider/40">
          {items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <VegIndicator isVeg={item.veg_flag !== false} />
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-ink leading-snug truncate">
                    {item.name}
                  </h3>
                  <div className="text-[11px] text-ink-faint font-mono">
                    ₹{item.price} each
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Stepper */}
                <div className="h-7 inline-flex items-center bg-canvas-warm border border-divider rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="w-6 h-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-white transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-2 text-xs font-bold text-ink font-mono">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => addItem(item)}
                    className="w-6 h-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-white transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <span className="text-xs sm:text-sm font-bold text-ink font-mono w-14 text-right">
                  ₹{(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Cooking Instructions ── */}
      <section className="bg-white border border-divider/80 rounded-2xl p-4 sm:p-5 shadow-xs mb-4">
        <label className="text-xs font-bold uppercase tracking-wider text-ink block mb-1.5 flex items-center gap-1.5 font-sans">
          <FileText className="w-3.5 h-3.5 text-gold-deep" />
          <span>Cooking Instructions for Chefs</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Extra adrak in chai, less sweet, crisp toasted bun maska..."
          rows={2}
          className="w-full p-3 bg-canvas-warm/40 border border-divider rounded-xl text-xs sm:text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all resize-none"
        />
      </section>

      {/* ── Section 3: Payment Method ── */}
      <section className="bg-white border border-divider/80 rounded-2xl p-4 sm:p-5 shadow-xs mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink mb-3 font-sans">
          Settlement Preference
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Cash on Counter */}
          <button
            type="button"
            onClick={() => setPaymentMethod(PaymentMethod.CASH)}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
              paymentMethod === PaymentMethod.CASH
                ? 'bg-gold-pale/40 border-gold shadow-xs'
                : 'bg-white border-divider hover:border-gold/40'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              paymentMethod === PaymentMethod.CASH ? 'bg-gold-deep text-white' : 'bg-canvas-warm text-ink-muted'
            }`}>
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-ink">Cash at Counter</span>
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5 leading-snug">
                Pay cash or scan QR at the cashier counter after dining.
              </p>
            </div>
          </button>

          {/* Instant Online Razorpay */}
          <button
            type="button"
            onClick={() => setPaymentMethod(PaymentMethod.RAZORPAY)}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
              paymentMethod === PaymentMethod.RAZORPAY
                ? 'bg-gold-pale/40 border-gold shadow-xs'
                : 'bg-white border-divider hover:border-gold/40'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              paymentMethod === PaymentMethod.RAZORPAY ? 'bg-gold-deep text-white' : 'bg-canvas-warm text-ink-muted'
            }`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-ink">Pay Now (UPI / Card)</span>
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5 leading-snug">
                Instant contactless settlement via GPay, PhonePe, Paytm, or Card.
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* ── Section 4: Transparent Restaurant Bill ── */}
      <section className="bg-white border border-divider/80 rounded-2xl p-4 sm:p-5 shadow-xs mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink pb-2 mb-3 border-b border-divider/60 font-sans">
          Bill Computation
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-ink-muted">
            <span>Item Subtotal</span>
            <span className="font-mono text-ink">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>CGST (2.5%)</span>
            <span className="font-mono text-ink">₹{cgst}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>SGST (2.5%)</span>
            <span className="font-mono text-ink">₹{sgst}</span>
          </div>
          <div className="pt-2 border-t border-divider/60 flex justify-between items-baseline font-bold text-sm sm:text-base text-ink">
            <span>Total Payable</span>
            <span className="font-mono text-gold-deep text-base sm:text-lg">₹{grandTotal}</span>
          </div>
        </div>
      </section>

      {/* ── Sticky Order Dispatch Button ── */}
      <div className="fixed bottom-4 left-4 right-4 z-40 max-w-xl mx-auto">
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full h-12 bg-gold hover:bg-gold-deep text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-between px-5 disabled:opacity-60"
        >
          {loading ? (
            <div className="w-full flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Transmitting Order to Kitchen...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span>Place Table Order</span>
                <span className="text-xs opacity-75 font-normal">• Table {tableNumber}</span>
              </div>
              <span className="font-mono text-base">₹{grandTotal}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
