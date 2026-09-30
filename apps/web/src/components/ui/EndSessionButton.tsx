'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';

export function EndSessionButton() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDone = async () => {
    try {
      setLoading(true);
      await apiFetch('/sessions/complete', { method: 'POST' });
      // Reload to let SessionGuard show the Thank You screen
      window.location.reload();
    } catch (err) {
      console.error('Failed to complete session', err);
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full h-11 bg-gold hover:bg-gold-deep text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 mt-4"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>End Session</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-left">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-ink mb-2">End your dining session?</h3>
            <p className="text-sm text-ink-muted mb-6 leading-relaxed">
              All your orders are complete. Ending your session will finalize your bill and clear the table.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 h-11 bg-canvas hover:bg-canvas-warm text-ink font-bold text-sm rounded-xl transition-colors"
              >
                Continue Dining
              </button>
              <button
                onClick={handleDone}
                disabled={loading}
                className="flex-1 h-11 bg-gold hover:bg-gold-deep text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
