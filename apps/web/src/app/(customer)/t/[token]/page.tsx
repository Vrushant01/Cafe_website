'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ResolveTableResponse, TableStatus, SOCKET_EVENTS } from '@chai-partner/shared';
import {
  Coffee,
  Users,
  CheckCircle2,
  PhoneCall,
  ArrowRight,
  Loader2,
  BellRing,
  Sparkles,
} from 'lucide-react';
import { TableStatusBadge } from '@/components/ui/Badge';

export default function TableLandingPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResolveTableResponse | null>(null);
  const [alertSent, setAlertSent] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);

  const fetchTableData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<ResolveTableResponse>(`/tables/${token}/resolve`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Unable to resolve table QR code. Please ask our café staff for assistance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();

    const socket = getSocket();
    const handleStatusChanged = (payload: { tableId: string; status: TableStatus }) => {
      setData((prev) => {
        if (!prev) return prev;
        const updatedAll = prev.all_tables.map((t) =>
          t.id === payload.tableId ? { ...t, status: payload.status } : t,
        );
        const updatedTable =
          prev.table.id === payload.tableId ? { ...prev.table, status: payload.status } : prev.table;
        return {
          ...prev,
          table: updatedTable,
          all_tables: updatedAll,
        };
      });
    };

    socket.on(SOCKET_EVENTS.TABLE_STATUS_CHANGED, handleStatusChanged);
    return () => {
      socket.off(SOCKET_EVENTS.TABLE_STATUS_CHANGED, handleStatusChanged);
    };
  }, [token]);

  const handleNotifyStaff = async () => {
    if (!data) return;
    try {
      setAlertLoading(true);
      await apiFetch('/tables/contact-manager', {
        method: 'POST',
        body: JSON.stringify({
          table_number: data.table.table_number,
          message: `Customer is physically present at Table ${data.table.table_number}, which currently shows as occupied.`,
        }),
      });
      setAlertSent(true);
    } catch {
      alert('Could not notify staff. Please approach the counter directly.');
    } finally {
      setAlertLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-white border border-divider shadow-xs flex items-center justify-center mb-3 text-gold-deep">
          <Coffee className="w-6 h-6 animate-pulse" strokeWidth={1.8} />
        </div>
        <h2 className="text-lg font-bold text-ink mb-1">
          Welcome to Chai Partner
        </h2>
        <p className="text-xs text-ink-muted">Locating your table reservation...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-canvas max-w-md mx-auto p-6 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl bg-danger-bg border border-danger-border flex items-center justify-center mb-3 text-danger">
          <Coffee className="w-6 h-6" strokeWidth={1.8} />
        </div>
        <h2 className="text-lg font-bold text-ink mb-2">QR Code Not Recognized</h2>
        <p className="text-xs sm:text-sm text-ink-muted mb-6 leading-relaxed">
          {error || 'This table code could not be verified. Please scan the QR card on your table or ask our counter staff.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="h-10 px-6 bg-gold hover:bg-gold-deep text-white rounded-lg font-bold text-xs shadow-xs transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { table } = data;
  const isAvailable = table.status === TableStatus.AVAILABLE;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      <div>
        {/* Top Mini Brand Header */}
        <header className="flex items-center justify-between pb-4 mb-6 border-b border-divider/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-canvas-warm border border-gold/30 flex items-center justify-center text-gold-deep shadow-xs">
              <Coffee className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <span
                className="font-serif font-bold text-ink text-base tracking-tight leading-none block"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                Chai Partner
              </span>
              <span className="text-[10px] text-ink-faint font-medium">Artisan Café Experience</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-divider/60 rounded-md text-[11px] font-medium text-ink-muted">
            <span className="w-2 h-2 rounded-full bg-ok pulse-live" />
            <span>Open Dining</span>
          </div>
        </header>

        {/* Café Welcome Hero Block */}
        <div className="bg-white rounded-2xl border border-divider/80 overflow-hidden shadow-xs mb-6">
          {/* Subtle Food Hero Banner */}
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-canvas-warm">
            <img
              src="/images/menu/kulhad_chai.jpg"
              alt="Chai Partner Artisan Cafe"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-pale/90 bg-gold-deep/80 px-2 py-0.5 rounded">
                Table Hospitality
              </span>
              <h1
                className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                Table {String(table.table_number).padStart(2, '0')}
              </h1>
            </div>
          </div>

          {/* Details & Actions */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between pb-4 border-b border-divider/60">
              <div className="flex items-center gap-2 text-xs text-ink-muted font-medium">
                <Users className="w-4 h-4 text-gold-deep" />
                <span>{table.seat_count} Guest Dining Seats</span>
              </div>
              <TableStatusBadge status={table.status} />
            </div>

            {isAvailable ? (
              <div className="pt-4">
                <p
                  className="text-lg font-serif font-bold text-ink mb-1"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  Welcome. Your table is ready.
                </p>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mb-6">
                  Browse our freshly brewed chais, artisanal coffees, and comforting kitchen bites crafted to order right to your seat.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/verify?table_id=${table.id}&table_number=${table.table_number}&token=${token}`,
                    )
                  }
                  className="w-full h-11 bg-gold hover:bg-gold-deep text-white rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
                >
                  <span>Take Seat & Start Ordering</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-center text-ink-faint mt-3">
                  Quick 10-second verification • Direct kitchen ordering
                </p>
              </div>
            ) : data.active_session?.status === 'exited' ? (
              <div className="pt-4">
                <div className="bg-canvas-warm p-4 rounded-xl border border-divider/60 mb-4">
                  <p className="text-xs font-bold text-ink mb-1 flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-gold-deep" />
                    Table reserved for returning customer
                  </p>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    This table is temporarily reserved for a customer who stepped away. If you are that customer, you can rejoin your session.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/verify?table_id=${table.id}&table_number=${table.table_number}&token=${token}`,
                    )
                  }
                  className="w-full h-11 bg-ink hover:bg-black text-white rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
                >
                  <span>Verify OTP to Rejoin</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Occupied Handling */
              <div className="pt-4">
                <div className="bg-canvas-warm p-4 rounded-xl border border-divider/60 mb-4">
                  <p className="text-xs font-bold text-ink mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gold-deep" />
                    Table currently marked as occupied
                  </p>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    If you are sitting here and the previous dining session has completed, notify our floor team below so we can clear your table immediately.
                  </p>
                </div>

                {alertSent ? (
                  <div className="p-3 bg-ok-bg border border-ok-border rounded-xl flex items-center gap-2 text-xs font-semibold text-ok">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Floor staff notified! An associate is heading to Table {table.table_number}.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleNotifyStaff}
                    disabled={alertLoading}
                    className="w-full h-10 bg-ink hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition-all inline-flex items-center justify-center gap-2"
                  >
                    {alertLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BellRing className="w-4 h-4 text-gold" />
                    )}
                    <span>Notify Floor Staff to Clear Table</span>
                  </button>
                )}

                <div className="mt-4 pt-4 border-t border-divider/60 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-ink">Need Immediate Help?</p>
                    <p className="text-[11px] text-ink-faint">Visit our café billing counter</p>
                  </div>
                  <a
                    href="tel:+919876543210"
                    className="h-8 px-3 bg-canvas-warm hover:bg-white rounded-lg font-semibold text-ink text-xs inline-flex items-center gap-1.5 border border-divider transition-colors"
                  >
                    <PhoneCall className="w-3 h-3 text-gold-deep" />
                    <span>Call Counter</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center text-[11px] text-ink-faint pt-4 border-t border-divider/40">
        Chai Partner Café • Artisan Dining Experience
      </footer>
    </div>
  );
}
