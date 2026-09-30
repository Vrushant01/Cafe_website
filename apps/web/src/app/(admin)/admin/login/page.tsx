'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Coffee,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ChefHat,
  UserCheck,
  DollarSign,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customCreds?: { email: string; pass: string }) => {
    if (e) e.preventDefault();
    const loginEmail = customCreds ? customCreds.email : email;
    const loginPass = customCreds ? customCreds.pass : password;

    if (!loginEmail || !loginPass) {
      setError('Email and password are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use direct fetch() with explicit URL to guarantee correct endpoint
      // regardless of NEXT_PUBLIC_API_URL env configuration.
      const apiBase = (
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      ).replace(/\/+$/, '').replace(/\/api$/, '');

      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error('Server returned an invalid response. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data?.message || `Login failed (${response.status})`);
      }

      // Validate response has required fields before saving
      if (!data?.access_token || typeof data.access_token !== 'string') {
        throw new Error('No access token received. Please try again.');
      }
      if (!data?.user?.id || !data?.user?.role) {
        throw new Error('Invalid user data received. Please try again.');
      }

      localStorage.setItem('cp_admin_token', data.access_token);
      localStorage.setItem('cp_admin_user', JSON.stringify(data.user));
      window.location.href = '/admin/orders';
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const quickLogins = [
    { label: 'Owner / Admin', email: 'admin@chaipartner.com', pass: 'admin123', icon: UserCheck, desc: 'Full system control' },
    { label: 'Head Chef', email: 'kitchen@chaipartner.com', pass: 'kitchen123', icon: ChefHat, desc: 'Live kitchen ticket queue' },
    { label: 'Cashier POS', email: 'cashier@chaipartner.com', pass: 'cashier123', icon: DollarSign, desc: 'Table billing & settlements' },
  ];

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* ── Left Decorative Panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-ink text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle geometric circles */}
        <div className="absolute top-1/4 -left-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full border border-white/5 pointer-events-none" />

        {/* Top Brand Mark */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-gold shadow-sm">
            <Coffee className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <div>
            <h1
              className="text-lg font-serif font-bold text-white leading-tight"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Chai Partner
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-gold-light">
              Artisan Café Operations
            </p>
          </div>
        </div>

        {/* Middle Editorial Statement */}
        <div className="relative z-10 max-w-sm my-auto py-8">
          <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-gold mb-2 block">
            Staff Operations Portal
          </span>
          <h2
            className="text-3xl sm:text-4xl font-serif font-light text-white leading-tight mb-4"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            Precision Table Orchestration & Kitchen Flow.
          </h2>
          <div className="w-12 h-0.5 bg-gold mb-4 rounded-full" />
          <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans">
            Real-time kitchen order tickets (KOT), live floor status, dynamic menu management, table billing, and financial reconciliation.
          </p>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>25 Dining Tables Online</span>
          <span>Version 1.0 Enterprise</span>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">

          {/* Mobile brand header */}
          <div className="text-center mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-2xl bg-white border border-divider shadow-xs flex items-center justify-center mx-auto mb-3 text-gold">
              <Coffee className="w-6 h-6" strokeWidth={1.8} />
            </div>
            <h1
              className="text-2xl font-serif font-bold text-ink"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Chai Partner
            </h1>
            <p className="text-xs text-ink-faint">Café Operations & POS</p>
          </div>

          <div className="mb-6">
            <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-gold block mb-1">
              Chai Partner
            </span>
            <h2
              className="text-2xl sm:text-3xl font-serif font-bold text-ink mb-1.5"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Staff Operations
            </h2>
            <p className="text-xs sm:text-sm text-ink-faint">
              Sign in to continue.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-danger-bg border border-danger-border rounded-xl text-xs font-semibold text-danger flex items-center gap-2.5 animate-slide-down">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 bg-white border border-divider p-6 sm:p-7 rounded-2xl shadow-xs">
            <div>
              <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-ink-muted block mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@chaipartner.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas-warm/40 border border-divider rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-ink-muted block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas-warm/40 border border-divider rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-6 bg-gold hover:bg-gold-deep text-white rounded-xl font-bold text-sm shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Development Test Accounts - Dev Only */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 pt-5 border-t border-divider">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-bold">
                  Development Test Accounts
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-muted text-ink-faint border border-divider font-mono">
                  DEV ONLY
                </span>
              </div>
              <p className="text-[11px] text-ink-faint mb-3">
                Pre-fills and authenticates against seeded staff credentials via actual backend API.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {quickLogins.map((role) => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.label}
                      type="button"
                      onClick={() => {
                        setEmail(role.email);
                        setPassword(role.pass);
                        handleLogin(undefined, { email: role.email, pass: role.pass });
                      }}
                      disabled={loading}
                      className="p-3 bg-white hover:bg-gold-pale/50 border border-divider hover:border-gold/40 rounded-xl text-left transition-all shadow-xs group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="w-3.5 h-3.5 text-gold group-hover:scale-105 transition-transform" />
                        <span className="text-xs font-bold text-ink truncate">{role.label}</span>
                      </div>
                      <p className="text-[10px] text-ink-faint leading-tight">
                        {role.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
