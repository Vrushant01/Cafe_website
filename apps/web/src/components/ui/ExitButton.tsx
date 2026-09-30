'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';
import { LogOut, X } from 'lucide-react';

export function ExitButton() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleExit = async () => {
    try {
      setLoading(true);
      await apiFetch('/sessions/exit', { method: 'POST' });
      // Reload to let SessionGuard take over
      window.location.reload();
    } catch (err) {
      console.error('Failed to exit session', err);
      setLoading(false);
    }
  };

  const modalContent = showModal && mounted ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-bold text-ink mb-2">Leave your table?</h3>
        <p className="text-sm text-ink-muted mb-6 leading-relaxed">
          Your session will remain active for 2 minutes. You can rejoin by scanning the table QR and verifying your OTP.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(false)}
            disabled={loading}
            className="flex-1 h-11 bg-canvas hover:bg-canvas-warm text-ink font-bold text-sm rounded-xl transition-colors"
          >
            Stay
          </button>
          <button
            onClick={handleExit}
            disabled={loading}
            className="flex-1 h-11 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : 'Exit Table'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="h-8 px-3 rounded-lg bg-canvas-warm hover:bg-canvas border border-divider text-ink-muted hover:text-ink text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
      >
        <span>Exit</span>
      </button>

      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
