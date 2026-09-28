'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { VerifyOtpResponse } from '@chai-partner/shared';
import { Coffee, ArrowLeft, ShieldCheck, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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

      router.push('/menu');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto p-4 flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="flex items-center justify-between py-4 mb-4">
          <button
            onClick={() => (step === 'otp' ? setStep('info') : router.back())}
            className="w-10 h-10 rounded-full bg-surface border border-cream-dark flex items-center justify-center text-coffee hover:bg-cream transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-terracotta text-surface rounded-full">
              Table {tableNumber}
            </span>
          </div>
        </header>

        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-surface rounded-2xl mx-auto flex items-center justify-center text-terracotta border border-terracotta/20 mb-3 shadow-xs">
            <Coffee className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-coffee">
            {step === 'info' ? 'Welcome to Chai Partner' : 'Verify Your Phone'}
          </h2>
          <p className="text-xs text-coffee/70 mt-1">
            {step === 'info'
              ? 'Enter your details to start ordering for Table ' + tableNumber
              : `A 6-digit code was sent to +91 ${phone.replace(/\D/g, '')}`}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-5 bg-error-light border border-error/25 rounded-xl flex items-center gap-2.5 text-xs font-medium text-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Info Form */}
        {step === 'info' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-coffee mb-1.5 uppercase tracking-wide">
                Your Full Name <span className="text-terracotta">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rohan Sharma"
                className="w-full px-4 py-3 bg-surface border border-cream-dark rounded-xl text-sm text-coffee placeholder-coffee/40 focus:outline-none focus:ring-2 focus:ring-terracotta font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-coffee mb-1.5 uppercase tracking-wide">
                Mobile Number <span className="text-terracotta">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-sm font-bold text-coffee/60">+91</span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  className="w-full pl-14 pr-4 py-3 bg-surface border border-cream-dark rounded-xl text-sm text-coffee placeholder-coffee/40 focus:outline-none focus:ring-2 focus:ring-terracotta font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-coffee mb-1.5 uppercase tracking-wide">
                Email Address <span className="text-coffee/40 font-normal">(Optional for bill)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohan@example.com"
                className="w-full px-4 py-3 bg-surface border border-cream-dark rounded-xl text-sm text-coffee placeholder-coffee/40 focus:outline-none focus:ring-2 focus:ring-terracotta font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3.5 px-6 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Continue & Send OTP</span>}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Confirmation */
          <form onSubmit={handleConfirmOtp} className="space-y-4">
            <div className="bg-cream/70 border border-terracotta/20 rounded-xl p-3 text-center mb-4">
              <span className="text-xs font-semibold text-terracotta">
                ✨ Fast Testing Mode: Use code <strong className="underline">123456</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-coffee mb-2 text-center uppercase tracking-wide">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3.5 bg-surface border-2 border-terracotta/40 rounded-xl text-coffee focus:outline-none focus:ring-2 focus:ring-terracotta"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-6 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Confirm & Open Menu</span>}
            </button>

            <div className="text-center pt-2">
              {cooldown > 0 ? (
                <span className="text-xs text-coffee/60 font-medium">Resend code in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  className="text-xs font-bold text-terracotta hover:underline"
                >
                  Resend OTP Code
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <footer className="text-center py-4 border-t border-cream-dark/50">
        <div className="flex items-center justify-center gap-1.5 text-xs text-sage font-medium">
          <ShieldCheck className="w-4 h-4 text-terracotta" />
          <span>2-Hour Session • Zero Spam Guarantee</span>
        </div>
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading verification...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
