'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ResolveTableResponse, TableStatus, SOCKET_EVENTS } from '@chai-partner/shared';
import { Coffee, Users, ShieldAlert, CheckCircle2, PhoneCall, ArrowRight, Loader2, BellRing } from 'lucide-react';

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
      setError(err.message || 'Unable to resolve table QR code. Please ask staff for assistance.');
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-terracotta animate-spin mb-4" />
        <p className="text-coffee font-medium">Resolving your table...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <div className="w-14 h-14 bg-error-light rounded-2xl flex items-center justify-center text-error mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-coffee mb-2">QR Code Not Recognized</h2>
        <p className="text-sm text-coffee/70 mb-6 leading-relaxed">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 px-6 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-semibold transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { table, all_tables } = data;
  const isAvailable = table.status === TableStatus.AVAILABLE;

  return (
    <div className="min-h-screen max-w-lg mx-auto p-4 pb-20">
      {/* Cafe Header */}
      <header className="flex items-center justify-between py-4 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center border border-terracotta/20 text-terracotta shadow-xs">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold text-coffee leading-tight">Chai Partner</h1>
            <p className="text-xs text-sage font-medium">Table Experience</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-surface border border-cream-dark rounded-full text-xs font-semibold text-coffee">
          <span className="w-2 h-2 rounded-full bg-success pulse-live"></span>
          <span>Live Floor</span>
        </div>
      </header>

      {/* Hero: Current Scanned Table Card */}
      <section className="bg-surface border-2 border-terracotta/30 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sage">You are at</span>
            <h2 className="text-2xl font-serif font-bold text-coffee mt-0.5">Table {table.table_number}</h2>
            <div className="flex items-center gap-1 text-xs text-coffee/70 mt-1 font-medium">
              <Users className="w-3.5 h-3.5 text-sage" />
              <span>{table.seat_count} Seats</span>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              isAvailable
                ? 'bg-success-light text-success border border-success/30'
                : 'bg-error-light text-error border border-error/30'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-success' : 'bg-error'}`}></span>
            <span>{isAvailable ? 'Available' : 'Occupied'}</span>
          </div>
        </div>

        {isAvailable ? (
          <div className="mt-5">
            <button
              onClick={() =>
                router.push(
                  `/verify?table_id=${table.id}&table_number=${table.table_number}&token=${token}`,
                )
              }
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-bold shadow-sm transition-all text-base"
            >
              <span>Sit & Start Ordering</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-center text-coffee/60 mt-2 font-medium">
              Takes 10 seconds • Quick OTP confirmation
            </p>
          </div>
        ) : (
          /* Occupied Fallback per PRD §6.1 / App-Flow §1.1 */
          <div className="mt-5 pt-4 border-t border-cream-dark">
            <div className="bg-cream/50 rounded-xl p-4 border border-terracotta/15 mb-4">
              <h3 className="text-sm font-bold text-coffee mb-1">
                Looks like this table shows occupied
              </h3>
              <p className="text-xs text-coffee/75 leading-relaxed">
                If you are physically sitting here and the previous guest has left, tap below to notify
                our manager or speak to the billing counter.
              </p>
            </div>

            {alertSent ? (
              <div className="p-3 bg-success-light border border-success/30 rounded-xl flex items-center gap-2 text-xs font-semibold text-success">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Manager notified! Staff will assist you at Table {table.table_number} in a moment.</span>
              </div>
            ) : (
              <button
                onClick={handleNotifyStaff}
                disabled={alertLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sage text-surface hover:bg-sage-dark rounded-xl text-sm font-bold transition-colors"
              >
                {alertLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BellRing className="w-4 h-4" />
                )}
                <span>Notify Staff / Clear Table</span>
              </button>
            )}

            <div className="mt-3 flex items-center justify-between text-xs text-coffee/80 bg-surface border border-cream-dark p-3 rounded-xl">
              <div>
                <p className="font-bold text-coffee">Manager Desk</p>
                <p className="text-sage">Chai Partner Counter</p>
              </div>
              <a
                href="tel:+919876543210"
                className="flex items-center gap-1.5 py-1.5 px-3 bg-cream hover:bg-cream-dark rounded-lg font-bold text-coffee text-xs transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-terracotta" />
                <span>Call Counter</span>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* Grid of All 25 Tables */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-coffee tracking-wide uppercase">Cafe Floor Overview</h3>
          <span className="text-xs text-sage font-medium">{all_tables.length} Tables Total</span>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-5">
          {all_tables.map((t) => {
            const isThisTable = t.id === table.id;
            const isTableAvail = t.status === TableStatus.AVAILABLE;
            return (
              <div
                key={t.id}
                className={`p-2.5 rounded-xl text-center border transition-all ${
                  isThisTable
                    ? 'border-terracotta bg-cream shadow-xs ring-2 ring-terracotta/30'
                    : 'border-terracotta/10 bg-surface'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isTableAvail ? 'bg-success' : 'bg-error'
                    }`}
                  ></span>
                  <span className="text-xs font-bold text-coffee">T{t.table_number}</span>
                </div>
                <div className="text-[10px] text-coffee/60 font-medium">{t.seat_count}s</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
