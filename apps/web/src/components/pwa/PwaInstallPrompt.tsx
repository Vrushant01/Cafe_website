'use client';

import { useState, useEffect } from 'react';
import { Coffee, Download, X } from 'lucide-react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if dismissed previously in this session
    if (sessionStorage.getItem('cp_pwa_dismissed')) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('cp_pwa_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-surface border border-terracotta/25 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cream text-terracotta border border-terracotta/20 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="font-serif font-bold text-coffee text-sm">Install Chai Partner</div>
            <div className="text-[11px] text-sage">Add to Home Screen for fast ordering</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-terracotta text-cream font-bold rounded-xl hover:bg-terracotta/90 transition-colors shadow-xs flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-coffee/40 hover:text-coffee rounded-lg"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
