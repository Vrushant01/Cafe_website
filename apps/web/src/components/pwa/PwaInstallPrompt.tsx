'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Coffee, Download, X } from 'lucide-react';

const DISMISS_SESSION_KEY = 'chai-partner-install-dismissed';

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Helper to safely check sessionStorage on client
  const isDismissedInSession = () => {
    if (typeof window === 'undefined') return true;
    try {
      return (
        sessionStorage.getItem(DISMISS_SESSION_KEY) === 'true' ||
        sessionStorage.getItem('cp_pwa_dismissed') === 'true'
      );
    } catch {
      return false;
    }
  };

  const isAdminRoute = Boolean(pathname && pathname.startsWith('/admin'));

  useEffect(() => {
    setMounted(true);

    // Never attach or display on staff / admin routes
    if (pathname && pathname.startsWith('/admin')) {
      setShowPrompt(false);
      return;
    }

    // Do not show if dismissed in this session
    if (isDismissedInSession()) {
      setShowPrompt(false);
      return;
    }

    const handler = (e: Event) => {
      // Re-verify current location and dismissal state when event fires
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        return;
      }
      if (isDismissedInSession()) {
        return;
      }
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [pathname]);

  // Synchronize route transitions
  useEffect(() => {
    if (isAdminRoute || isDismissedInSession()) {
      setShowPrompt(false);
    }
  }, [pathname, isAdminRoute]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        try {
          sessionStorage.setItem(DISMISS_SESSION_KEY, 'true');
        } catch {}
      }
    } catch {}

    // Once install action is triggered, dismiss prompt for current session
    setShowPrompt(false);
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, 'true');
      sessionStorage.setItem('cp_pwa_dismissed', 'true');
    } catch {}
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, 'true');
      sessionStorage.setItem('cp_pwa_dismissed', 'true');
    } catch {}
  };

  // Guard against SSR hydration mismatch and admin routes
  if (!mounted || !showPrompt || isAdminRoute) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-50 animate-slide-down">
      <div className="bg-white border border-divider rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-canvas-warm text-gold border border-divider flex items-center justify-center flex-shrink-0 shadow-xs">
            <Coffee className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <div>
            <div
              className="font-serif font-bold text-ink text-sm"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Install Chai Partner
            </div>
            <div className="text-[11px] text-ink-faint">
              Add to Home Screen for fast table ordering
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3.5 py-1.5 bg-gold text-white font-bold rounded-xl hover:bg-gold-deep transition-all shadow-xs flex items-center gap-1 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-ink-faint hover:text-ink rounded-lg transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
