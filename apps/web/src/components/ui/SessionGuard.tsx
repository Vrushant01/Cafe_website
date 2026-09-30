'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Coffee, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';

export function SessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token = localStorage.getItem('cp_session_token');
        if (!token) {
          if (!pathname.startsWith('/t/') && !pathname.startsWith('/verify')) {
            router.replace('/');
          }
          setLoading(false);
          return;
        }

        const data = await apiFetch<any>('/sessions/current');

        // Rule: If session is COMPLETED or EXPIRED, and customer is scanning a QR (/t/) or verifying,
        // it means they are trying to start a fresh session. Do not restore the old terminal session!
        if ((data.session.status === 'completed' || data.session.status === 'expired') && 
            (pathname.startsWith('/t/') || pathname.startsWith('/verify'))) {
          localStorage.removeItem('cp_session_token');
          localStorage.removeItem('cp_table_number');
          localStorage.removeItem('cp_session_order_ids');
          setSessionData(null);
          setLoading(false);
          return;
        }

        // Rule: If session is ACTIVE, and they are scanning the QR or on verify, auto-redirect to their menu
        if (data.session.status === 'active' && 
            (pathname.startsWith('/t/') || pathname.startsWith('/verify'))) {
           router.replace('/menu');
           return;
        }

        setSessionData(data.session);

        if (data.session.status === 'exited') {
          const expiry = new Date(data.session.rejoin_expires_at).getTime();
          setTimeLeft(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
        }
      } catch (err: any) {
        console.error('Session guard failed:', err);
        if (err.message && (err.message.toLowerCase().includes('unauthorized') || err.message.toLowerCase().includes('expired'))) {
          localStorage.removeItem('cp_session_token');
          localStorage.removeItem('cp_table_number');
          localStorage.removeItem('cp_session_order_ids');
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
    
    // Poll every 10 seconds to catch server-side sweeps
    const interval = setInterval(fetchSession, 10000);
    return () => clearInterval(interval);
  }, [router, pathname]);

  useEffect(() => {
    if (sessionData?.status === 'exited') {
      if (timeLeft > 0) {
        const timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              // It expired locally, instantly show session closed page
              setError(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      } else {
        // If it loaded with 0 time left or already expired, force error state
        setError(true);
      }
    }
  }, [sessionData?.status, timeLeft]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <Coffee className="w-12 h-12 text-ink-muted mb-4 opacity-50" />
        <h1 className="text-xl font-bold text-ink mb-2">Your session has expired</h1>
        <p className="text-sm text-ink-muted max-w-sm mb-6 leading-relaxed">
          Your 2-minute rejoin window has ended and the table has been released.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 bg-ink text-white rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all"
        >
          Scan New Table
        </button>
      </div>
    );
  }

  if (sessionData?.status === 'exited' && !pathname.startsWith('/t/') && !pathname.startsWith('/verify')) {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-canvas-warm border border-divider flex items-center justify-center mb-6 shadow-xs">
          <Coffee className="w-8 h-8 text-gold-deep opacity-80" />
        </div>
        
        <h1 className="text-2xl font-serif font-bold text-ink tracking-tight mb-2">
          You&apos;re temporarily away
        </h1>
        <p className="text-sm text-ink-muted max-w-xs mb-8 leading-relaxed">
          Your table is reserved for you for the next 2 minutes.<br/><br/>
          Rejoin by scanning the QR code at your table and verifying your OTP.
        </p>
        
        <div className="bg-white border border-divider/60 rounded-2xl p-5 w-full max-w-xs shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-2">
            Rejoin Window
          </p>
          <div className="text-4xl font-mono font-bold text-ink tabular-nums tracking-tight">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
        </div>
      </div>
    );
  }

  if (sessionData?.status === 'completed') {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-ok/10 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-ok" />
        </div>
        
        <h1 className="text-2xl font-serif font-bold text-ink tracking-tight mb-2">
          Thank you for dining with Chai Partner
        </h1>
        <p className="text-sm text-ink-muted max-w-sm mb-6 leading-relaxed">
          Your dining session is complete.
        </p>

        <div className="flex flex-col items-center mb-6 w-full max-w-xs">
          <div className="w-full bg-white border border-divider/60 rounded-t-xl px-5 py-4 border-b-0 shadow-sm flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-1">Final bill</span>
            <span className="text-xl font-mono font-bold text-ink">
              Total: ₹{sessionData?.finalAmount?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="w-full bg-canvas-warm border border-divider/60 rounded-b-xl px-5 py-3 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-2">Bill details</span>
            {sessionData?.customer_email && <span className="text-xs font-medium text-ink mb-1">Email: {sessionData.customer_email}</span>}
            {sessionData?.customer_phone && <span className="text-xs font-medium text-ink">Phone: {sessionData.customer_phone}</span>}
          </div>
        </div>

        <p className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-8">
          Table released
        </p>

        <Link href="/" className="h-12 px-8 rounded-full bg-ink text-white font-bold flex items-center justify-center text-xs uppercase tracking-widest hover:bg-gold-deep transition-colors">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <>
      {children}
      <PwaInstallPrompt />
    </>
  );
}
