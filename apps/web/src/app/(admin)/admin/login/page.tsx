'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Coffee, ShieldCheck, Loader2, AlertCircle, ChefHat, UserCheck, DollarSign } from 'lucide-react';

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

    try {
      setLoading(true);
      setError(null);

      const res = await apiFetch<{
        access_token: string;
        user: { id: string; name: string; role: string; email: string };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      localStorage.setItem('cp_admin_token', res.access_token);
      localStorage.setItem('cp_admin_user', JSON.stringify(res.user));

      router.push('/admin/orders');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-surface border border-terracotta/20 rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-cream rounded-2xl mx-auto flex items-center justify-center text-terracotta border border-terracotta/20 mb-3 shadow-xs">
            <Coffee className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-coffee">Staff Portal</h1>
          <p className="text-xs text-sage font-medium mt-1">Chai Partner Dashboard Login</p>
        </div>

        {error && (
          <div className="p-3 mb-5 bg-error-light border border-error/25 rounded-xl flex items-center gap-2.5 text-xs font-medium text-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-coffee mb-1 uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@chaipartner.com"
              className="w-full px-4 py-3 bg-cream/40 border border-cream-dark rounded-xl text-sm text-coffee placeholder-coffee/40 focus:outline-none focus:ring-2 focus:ring-terracotta font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-coffee mb-1 uppercase tracking-wide">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-cream/40 border border-cream-dark rounded-xl text-sm text-coffee placeholder-coffee/40 focus:outline-none focus:ring-2 focus:ring-terracotta font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Sign In to Dashboard</span>}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-8 pt-6 border-t border-cream-dark">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sage block mb-3 text-center">
            ⚡ 1-Click Demo Logins
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleLogin(undefined, { email: 'admin@chaipartner.com', pass: 'admin123' })}
              className="p-2.5 bg-cream/70 hover:bg-cream border border-terracotta/20 rounded-xl text-center transition-colors"
            >
              <UserCheck className="w-4 h-4 text-terracotta mx-auto mb-1" />
              <span className="text-[11px] font-bold text-coffee block">Admin</span>
            </button>
            <button
              onClick={() => handleLogin(undefined, { email: 'kitchen@chaipartner.com', pass: 'kitchen123' })}
              className="p-2.5 bg-cream/70 hover:bg-cream border border-terracotta/20 rounded-xl text-center transition-colors"
            >
              <ChefHat className="w-4 h-4 text-terracotta mx-auto mb-1" />
              <span className="text-[11px] font-bold text-coffee block">Kitchen</span>
            </button>
            <button
              onClick={() => handleLogin(undefined, { email: 'cashier@chaipartner.com', pass: 'cashier123' })}
              className="p-2.5 bg-cream/70 hover:bg-cream border border-terracotta/20 rounded-xl text-center transition-colors"
            >
              <DollarSign className="w-4 h-4 text-terracotta mx-auto mb-1" />
              <span className="text-[11px] font-bold text-coffee block">Cashier</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
