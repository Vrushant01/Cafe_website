'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { apiFetch } from '@/lib/api';
import { PaymentMethod, IOrder } from '@chai-partner/shared';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

// Dynamically load Razorpay SDK script
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

  if (items.length === 0) {
    return (
      <div className="min-h-screen max-w-md mx-auto p-6 flex flex-col items-center justify-center text-center">
        <Receipt className="w-12 h-12 text-sage/60 mb-3" />
        <h2 className="text-xl font-serif font-bold text-coffee">Your Cart is Empty</h2>
        <p className="text-xs text-coffee/60 mt-1 mb-6">Add hot chai, snacks, or pizzas to get started.</p>
        <button
          onClick={() => router.push('/menu')}
          className="py-3 px-6 bg-terracotta text-surface rounded-xl font-bold text-sm"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      // Generate robust client-side Idempotency-Key (BRAIN Rule 4)
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const payload = {
        items: items.map((i) => ({ menu_item_id: i.id, qty: i.qty })),
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      };

      // 1. Create order on server with Idempotency-Key
      const order = await apiFetch<IOrder>('/orders', {
        method: 'POST',
        idempotencyKey,
        body: JSON.stringify(payload),
      });

      // 2. Handle Razorpay Online Payment Flow
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
            const customerName = localStorage.getItem('cp_customer_name') || 'Guest';

            const options = {
              key: rzpData.key_id,
              amount: rzpData.amount,
              currency: rzpData.currency,
              name: 'Chai Partner',
              description: `Order ${order.order_number}`,
              order_id: rzpData.razorpay_order_id,
              prefill: {
                name: customerName,
              },
              theme: {
                color: '#8B5E3C', // terracotta theme
              },
              handler: async (response: any) => {
                try {
                  // Verify signature on server (BRAIN Rule 3)
                  await apiFetch('/payments/razorpay/verify', {
                    method: 'POST',
                    body: JSON.stringify({
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                    }),
                  });
                } catch (verifyErr) {
                  console.warn('Client verification note:', verifyErr);
                } finally {
                  clearCart();
                  router.push(`/track/${order.id}`);
                }
              },
              modal: {
                ondismiss: () => {
                  clearCart();
                  router.push(`/track/${order.id}`);
                },
              },
            };

            const rzpInstance = new (window as any).Razorpay(options);
            rzpInstance.open();
            return;
          } else {
            // Local Test / Dev Mock Mode: Simulate Instant Online Advance Payment
            console.log('[Payment] Dev mode: Simulating client signature verification');
            await apiFetch('/payments/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: rzpData.razorpay_order_id,
                razorpay_payment_id: `pay_mock_${Date.now()}`,
                razorpay_signature: 'mock_valid_signature',
              }),
            });
          }
        } catch (paymentErr) {
          console.warn('Razorpay order initiation note:', paymentErr);
        }
      }

      // Clear cart on successful order creation
      clearCart();

      // Redirect to Order Tracking screen
      router.push(`/track/${order.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream max-w-md mx-auto p-4 pb-28">
      {/* Header */}
      <header className="flex items-center justify-between py-3 mb-3 border-b border-cream-dark">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-surface border border-cream-dark flex items-center justify-center text-coffee hover:bg-cream transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-base font-serif font-bold text-coffee">Review Order & Bill</h1>
        <div className="w-9"></div>
      </header>

      {error && (
        <div className="p-3 mb-4 bg-error-light border border-error/25 rounded-xl flex items-center gap-2.5 text-xs font-medium text-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cart Items List */}
      <section className="bg-surface border border-terracotta/15 rounded-2xl p-4 shadow-xs mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-sage mb-3">Order Items</h2>
        <div className="divide-y divide-cream-dark">
          {items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border border-success rounded-xs flex items-center justify-center p-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                  </span>
                  <span className="text-sm font-bold text-coffee">{item.name}</span>
                </div>
                <div className="text-xs text-coffee/60 mt-0.5 font-medium">₹{item.price} each</div>
              </div>

              {/* Stepper */}
              <div className="flex items-center bg-cream border border-terracotta/20 rounded-xl overflow-hidden shadow-xs">
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-coffee hover:bg-terracotta hover:text-surface transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-2.5 text-xs font-bold text-coffee min-w-[20px] text-center">
                  {item.qty}
                </span>
                <button
                  onClick={() => addItem(item)}
                  className="p-1.5 text-coffee hover:bg-terracotta hover:text-surface transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-14 text-right text-sm font-bold text-coffee">
                ₹{item.price * item.qty}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Special Instructions */}
      <section className="bg-surface border border-terracotta/15 rounded-2xl p-4 shadow-xs mb-4">
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sage mb-2">
          <FileText className="w-3.5 h-3.5 text-terracotta" />
          <span>Cooking Instructions / Notes</span>
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Less sugar in chai, extra spicy pav bhaji..."
          className="w-full p-3 bg-cream/40 border border-cream-dark rounded-xl text-xs sm:text-sm text-coffee placeholder-coffee/40 focus:outline-none focus:ring-2 focus:ring-terracotta resize-none font-medium"
        />
      </section>

      {/* Payment Method Selection */}
      <section className="bg-surface border border-terracotta/15 rounded-2xl p-4 shadow-xs mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-sage mb-3">Choose Payment Method</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setPaymentMethod(PaymentMethod.CASH)}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
              paymentMethod === PaymentMethod.CASH
                ? 'border-terracotta bg-cream shadow-xs ring-1 ring-terracotta'
                : 'border-cream-dark bg-surface hover:bg-cream/40'
            }`}
          >
            <Banknote className="w-5 h-5 text-terracotta mb-2" />
            <div>
              <span className="text-xs font-bold text-coffee block">Cash at Counter</span>
              <span className="text-[10px] text-coffee/60">Pay before or after meal</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod(PaymentMethod.RAZORPAY)}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
              paymentMethod === PaymentMethod.RAZORPAY
                ? 'border-terracotta bg-cream shadow-xs ring-1 ring-terracotta'
                : 'border-cream-dark bg-surface hover:bg-cream/40'
            }`}
          >
            <CreditCard className="w-5 h-5 text-terracotta mb-2" />
            <div>
              <span className="text-xs font-bold text-coffee block flex items-center gap-1">
                <span>Razorpay / UPI</span>
                <Sparkles className="w-3 h-3 text-warning" />
              </span>
              <span className="text-[10px] text-coffee/60">Instant Online Advance</span>
            </div>
          </button>
        </div>
      </section>

      {/* Bill Breakup */}
      <section className="bg-surface border border-terracotta/15 rounded-2xl p-4 shadow-xs mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-sage mb-3">Bill Breakup</h2>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-coffee/80">
            <span>Item Subtotal</span>
            <span className="font-semibold text-coffee">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-coffee/80">
            <span>GST (5%)</span>
            <span className="font-semibold text-coffee">₹{tax.toFixed(2)}</span>
          </div>
          <div className="pt-2 border-t border-cream-dark flex justify-between items-center text-sm font-bold text-coffee">
            <span>Grand Total</span>
            <span className="text-base text-terracotta">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* Sticky Bottom Place Order CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-cream via-cream to-transparent z-40 max-w-md mx-auto">
        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full py-3.5 px-6 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-bold transition-all flex items-center justify-between shadow-md text-sm"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 w-full">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>
                {paymentMethod === PaymentMethod.RAZORPAY
                  ? 'Connecting to Razorpay...'
                  : 'Sending Order to Kitchen...'}
              </span>
            </div>
          ) : (
            <>
              <div className="text-left">
                <span className="block text-[10px] uppercase font-semibold text-cream/70">
                  {paymentMethod === PaymentMethod.CASH ? 'Pay At Counter' : 'Pay Online via UPI/Card'}
                </span>
                <span className="text-base font-bold text-surface">₹{grandTotal.toFixed(2)}</span>
              </div>
              <span className="text-sm font-bold">
                {paymentMethod === PaymentMethod.RAZORPAY ? 'Pay & Order →' : 'Place Order & Track →'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
