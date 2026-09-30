'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { VerifyOtpResponse } from '@chai-partner/shared';
import {
  Coffee,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Phone,
  User,
  Mail,
  KeyRound,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tableId = searchParams.get('table_id') || '';
  const tableNumber = searchParams.get('table_number') || '';
  const token = searchParams.get('token') || '';

  const [step, setStep] = useState<'info' | 'otp'>('info');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiFetch('/sessions/verify/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          table_id: tableId,
          phone: cleanPhone,
          name: name.trim(),
          email: email.trim() || undefined,
        }),
      });

      setStep('otp');
      setCooldown(60);
      setOtp('123456'); // Pre-fill mock OTP for seamless testing
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please check table status.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<VerifyOtpResponse>('/sessions/verify/confirm-otp', {
        method: 'POST',
        body: JSON.stringify({
          table_id: tableId,
          phone: phone.replace(/\D/g, ''),
          otp: otp.trim(),
          name: name.trim(),
          email: email.trim() || undefined,
        }),
      });

      // Save session credentials
      localStorage.setItem('cp_session_token', res.session_token);
      localStorage.setItem('cp_session_id', res.session.id);
      localStorage.setItem('cp_customer_name', res.session.customer_name);
      localStorage.setItem('cp_table_number', String(res.table.table_number));
      localStorage.setItem('cp_table_id', res.table.id);
      // Clear previous session's order tracking history
      localStorage.removeItem('cp_session_order_ids');

      router.push('/menu');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink max-w-md mx-auto p-4 sm:p-6 flex flex-col justify-between">
      <div>
        {/* Navigation Header */}
        <header className="flex items-center justify-between pb-4 mb-6 border-b border-divider/60">
          <button
            type="button"
            onClick={() => (step === 'otp' ? setStep('info') : router.back())}
            className="w-9 h-9 rounded-lg bg-white border border-divider/70 flex items-center justify-center text-ink hover:text-gold-deep hover:bg-canvas-warm transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-gold-pale text-gold-deep border border-gold-muted/60 rounded-md">
              Table {tableNumber || '1'}
            </span>
          </div>
        </header>

        {/* Hospitality Banner */}
        <div className="mb-6">
          <div className="w-10 h-10 bg-canvas-warm rounded-xl flex items-center justify-center text-gold-deep border border-gold/30 mb-3 shadow-xs">
            <Coffee className="w-5 h-5" strokeWidth={1.8} />
          </div>

          <h1
            className="text-2xl font-serif font-bold text-ink mb-1 tracking-tight"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            {step === 'info' ? 'Welcome to Your Table' : 'Verify Your Mobile'}
          </h1>

          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            {step === 'info'
              ? 'Please provide your details so our kitchen and floor team know who to serve.'
              : `We sent a 6-digit confirmation code to +91 ${phone}.`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-danger-bg border border-danger-border rounded-xl flex items-center gap-2.5 text-xs font-semibold text-danger">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Guest Information */}
        {step === 'info' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4 bg-white border border-divider/80 p-5 sm:p-6 rounded-2xl shadow-xs">
            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">
                Full Name <span className="text-gold-deep">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vrushant Shiroya"
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas-warm/40 border border-divider rounded-xl text-xs sm:text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">
                Mobile Number <span className="text-gold-deep">*</span>
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-divider bg-canvas-warm text-ink font-mono text-xs font-semibold select-none">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="w-full pl-3 pr-4 py-2.5 bg-canvas-warm/40 border border-divider rounded-r-xl text-xs sm:text-sm text-ink placeholder-ink-faint font-mono focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
                />
              </div>
              <p className="text-[11px] text-ink-faint mt-1">
                Used to notify you when your chai and snacks are served.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">
                Email Address <span className="text-ink-faint text-[10px] font-normal">(Optional for digital invoice)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas-warm/40 border border-divider rounded-xl text-xs sm:text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gold hover:bg-gold-deep text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-98 inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Continue to Table Verification</span>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Confirmation */
          <form onSubmit={handleConfirmOtp} className="space-y-4 bg-white border border-divider/80 p-5 sm:p-6 rounded-2xl shadow-xs">
            <div className="p-3 bg-canvas-warm rounded-xl border border-divider/60 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-ink">Table {tableNumber} • Guest</p>
                <p className="text-ink-muted">{name} (+91 {phone})</p>
              </div>
              <button
                type="button"
                onClick={() => setStep('info')}
                className="text-gold-deep font-semibold hover:underline"
              >
                Change
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-3 bg-canvas-warm/40 border border-divider rounded-xl text-center text-lg font-mono font-bold tracking-widest text-ink focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all"
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="text-ink-faint">Development test code: 123456</span>
                {cooldown > 0 ? (
                  <span className="text-ink-faint font-mono">Resend in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    className="text-gold-deep font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Resend Code</span>
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gold hover:bg-gold-deep text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-98 inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Confirm & Open Menu</span>
              )}
            </button>
          </form>
        )}
      </div>

      <footer className="text-center text-[11px] text-ink-faint pt-4 border-t border-divider/40">
        Chai Partner Hospitality • Secure Dining Session
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gold animate-spin" />
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
