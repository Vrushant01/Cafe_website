'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Coffee, Loader2 } from 'lucide-react';
import { AdminRole, Permission, hasPermission, ROLE_CONFIGS } from '@/lib/permissions';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  requiredPermission: Permission;
  title?: string;
}

export function AdminRouteGuard({
  children,
  requiredPermission,
  title = 'this section',
}: AdminRouteGuardProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: AdminRole;
    email: string;
  } | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    try {
      const rawToken = localStorage.getItem('cp_admin_token');
      const rawUser = localStorage.getItem('cp_admin_user');

      // Treat 'undefined'/'null' strings as missing
      const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken : null;
      const userStr = rawUser && rawUser !== 'undefined' && rawUser !== 'null' ? rawUser : null;

      if (!token || !userStr) {
        setDebugError(`Missing auth data. token=${!!token}, userStr=${userStr}`);
        return;
      }

      let user: { id: string; name: string; role: string; email: string } | null = null;
      try {
        user = JSON.parse(userStr);
      } catch (err: any) {
        setDebugError(`Invalid user JSON: ${err.message} | Str: ${userStr}`);
        return;
      }

      if (!user || !user.id || !user.role) {
        setDebugError(`User missing id or role: ${JSON.stringify(user)}`);
        return;
      }

      setCurrentUser(user as any);
      const allowed = hasPermission(user.role, requiredPermission);
      setIsAuthorized(allowed);
    } catch (err: any) {
      setDebugError(`Unexpected error: ${err.message}\n${err.stack}`);
    }
  }, [requiredPermission]);

  // Prevent hydration mismatch
  if (!mounted || (isAuthorized === null && !debugError)) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-white border border-divider shadow-xs flex items-center justify-center text-gold-deep mb-3 animate-spin">
          <Loader2 className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-ink-muted">Verifying staff permissions...</p>
      </div>
    );
  }

  if (debugError) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white border border-danger rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-danger mb-4">Auth Guard Failed</h2>
          <pre className="bg-canvas-warm p-4 rounded-xl text-xs overflow-auto whitespace-pre-wrap font-mono text-ink-muted">
            {debugError}
          </pre>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.href = '/admin/login';
            }}
            className="mt-6 w-full py-3 bg-danger hover:bg-danger-hover text-white rounded-xl font-bold"
          >
            Clear Data & Return to Login
          </button>
        </div>
      </div>
    );
  }


  // Unauthorized Access Restricted State
  if (!isAuthorized) {
    const roleLabel = currentUser?.role && ROLE_CONFIGS[currentUser.role]
      ? ROLE_CONFIGS[currentUser.role].label
      : 'current';

    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-divider rounded-3xl p-8 sm:p-10 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger-bg text-danger border border-danger-border flex items-center justify-center mx-auto mb-5 shadow-xs">
            <ShieldAlert className="w-7 h-7" strokeWidth={1.75} />
          </div>

          <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-danger mb-2 block">
            Access Restricted
          </span>

          <h2
            className="text-2xl font-serif font-bold text-ink mb-2"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Permission Required
          </h2>

          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mb-6">
            Your <span className="font-bold text-ink">{roleLabel}</span> role does not have authorization to view {title}.
          </p>

          <div className="p-3.5 bg-canvas-warm/70 border border-divider/70 rounded-xl text-left text-xs text-ink-muted mb-6">
            <div className="flex items-center gap-2 font-bold text-ink mb-1">
              <Coffee className="w-3.5 h-3.5 text-gold-deep" />
              <span>Café Operational Policy</span>
            </div>
            <p className="text-[11px] text-ink-faint leading-relaxed">
              This area is restricted according to café role policies. If you need access, please consult the café owner or administrator.
            </p>
          </div>

          <Link
            href="/admin/orders"
            className="w-full py-3 px-5 bg-gold hover:bg-gold-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-2 active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Operations Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
