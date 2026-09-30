'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  Coffee,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Printer,
  ExternalLink,
  Users,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { TableStatus } from '@chai-partner/shared';
import { TableStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface TableInfo {
  id: string;
  table_number: number;
  seat_count: number;
  status: TableStatus;
  qr_token: string;
}

const FALLBACK_TABLES: TableInfo[] = Array.from({ length: 25 }, (_, i) => {
  const num = i + 1;
  let seats = 2;
  if (num > 10 && num <= 20) seats = 4;
  else if (num > 20) seats = 6;
  
  return {
    id: String(num),
    table_number: num,
    seat_count: seats,
    status: TableStatus.AVAILABLE,
    qr_token: `table_${num}_fallback`
  };
});

export default function HomePage() {
  const [tables, setTables] = useState<TableInfo[]>(FALLBACK_TABLES);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<TableInfo[]>('/tables');
      if (Array.isArray(res) && res.length > 0) setTables(res);
    } catch {
      // Keep fallbacks
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const selectedTable = tables.find((t) => t.table_number === selectedTableNumber) || tables[0];
  const qrPngUrl = `/generated-qrs/table-${String(selectedTable.table_number).padStart(2, '0')}.png`;
  const occupiedCount = tables.filter((t) => t.status === TableStatus.OCCUPIED).length;
  const availableCount = tables.length - occupiedCount;

  return (
    <main className="min-h-screen bg-canvas flex flex-col justify-between">
      {/* ── Top Navigation Bar ── */}
      <nav className="w-full border-b border-divider bg-white/70 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-canvas-warm border border-divider flex items-center justify-center text-gold shadow-xs">
              <Coffee className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <div>
              <span
                className="font-serif font-bold text-ink text-base tracking-tight leading-none block"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                Chai Partner
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gold-deep">
                Artisan Café & Roastery
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-canvas-warm border border-divider rounded-full text-xs font-medium text-ink-muted">
              <span className="w-2 h-2 rounded-full bg-ok pulse-live" />
              <span>
                {availableCount} of {tables.length} Tables Free
              </span>
            </div>

            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-divider hover:border-gold hover:bg-gold-pale/50 text-ink-muted hover:text-gold-deep transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Staff Portal</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero / Brand Moment ── */}
      <section className="px-4 py-10 sm:py-16 max-w-4xl mx-auto text-center animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-pale border border-gold-muted text-gold-deep text-xs font-semibold mb-5 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>QR-Based Table Ordering & Live Kitchen Dispatch</span>
        </div>

        <h1
          className="text-4xl sm:text-6xl font-serif font-medium text-ink tracking-heading leading-[1.1] mb-4"
          style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
        >
          Freshly Brewed Chai &<br className="hidden sm:inline" /> Handcrafted Delights
        </h1>

        <div className="w-12 h-0.5 bg-gold/50 mx-auto mb-4 rounded-full" />

        <p className="text-sm sm:text-base text-ink-muted font-sans font-normal max-w-xl mx-auto leading-relaxed">
          Welcome to Chai Partner. Guests scan the unique QR code placed on their dining table to browse our artisanal menu, order directly to the kitchen, and track live preparation.
        </p>
      </section>

      {/* ── Main Interactive Table Floor Simulation ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 mb-12">
        <div className="bg-white border border-divider rounded-3xl shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12">

          {/* Left Column: Floor Map Table Selector (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-divider flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2
                    className="text-lg font-serif font-semibold text-ink"
                    style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                  >
                    Select a Table to Simulate
                  </h2>
                  <p className="text-xs text-ink-faint mt-0.5">
                    Click any table below to preview its QR code and guest journey.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchTables}
                  disabled={loading}
                  title="Refresh Floor State"
                  className="p-2 text-ink-faint hover:text-ink rounded-lg border border-divider hover:bg-canvas-warm transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-gold' : ''}`} />
                </button>
              </div>

              {/* Table Grid (5 cols) */}
              <div className="grid grid-cols-5 gap-2 sm:gap-2.5 my-4">
                {tables.map((t) => {
                  const isSelected = t.table_number === selectedTableNumber;
                  const isAvailable = t.status === TableStatus.AVAILABLE;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTableNumber(t.table_number)}
                      className={`relative p-2.5 sm:p-3 rounded-2xl border text-center transition-all duration-200 select-none ${
                        isSelected
                          ? 'border-gold bg-gold-pale/80 shadow-sm ring-2 ring-gold/40'
                          : isAvailable
                          ? 'border-divider bg-white hover:border-gold/50 hover:bg-canvas-warm/50'
                          : 'border-danger/30 bg-danger-bg/40 hover:border-danger/60'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isAvailable ? 'bg-ok' : 'bg-danger'
                          }`}
                        />
                        <span className="text-xs sm:text-sm font-bold text-ink">
                          T{t.table_number}
                        </span>
                      </div>
                      <div className="text-[10px] text-ink-faint font-medium">
                        {t.seat_count} seats
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Table Capacity Legend */}
              <div className="mt-4 pt-3 border-t border-divider-subtle flex flex-wrap items-center justify-between text-xs text-ink-faint gap-3">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-ok" /> Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-danger" /> Occupied
                  </span>
                </div>
                <div className="text-[11px] text-ink-faint">
                  T1–T10: 2-seater · T11–T20: 4-seater · T21–T25: 6-seater
                </div>
              </div>
            </div>

            {/* Print QR Sheet Link */}
            <div className="mt-6 pt-4 border-t border-divider flex items-center justify-between text-xs">
              <span className="text-ink-faint">Café Floor Manager Utility:</span>
              <a
                href="/generated-qrs/print-cards.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-gold-deep hover:text-gold font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Open Printable Table QR Sheets</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </div>
          </div>

          {/* Right Column: Selected Table Preview (5 cols) */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-canvas-warm/50 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-ink-faint">
                    Selected Table
                  </span>
                  <h3
                    className="text-2xl font-serif font-bold text-ink leading-tight"
                    style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                  >
                    Table {selectedTable.table_number}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-ink-faint mt-1">
                    <Users className="w-3.5 h-3.5 text-gold" />
                    <span>{selectedTable.seat_count} Guest Dining Seats</span>
                  </div>
                </div>

                <TableStatusBadge status={selectedTable.status} />
              </div>

              {/* QR Code Container */}
              <div className="bg-white border border-divider rounded-2xl p-4 shadow-sm text-center my-4 max-w-[220px] mx-auto">
                <div className="relative w-full aspect-square flex items-center justify-center bg-canvas rounded-xl overflow-hidden border border-divider-subtle">
                  <img
                    src={qrPngUrl}
                    alt={`Table ${selectedTable.table_number} QR`}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-ink-faint pointer-events-none -z-10">
                    <QrCode className="w-12 h-12 text-gold mb-1" />
                    <span className="text-[10px]">QR Code</span>
                  </div>
                </div>
                <p className="text-[10px] text-ink-faint mt-2 font-mono truncate">
                  {selectedTable.qr_token}
                </p>
              </div>

              <p className="text-xs text-ink-muted text-center leading-relaxed">
                Scan with any smartphone camera or tap the button below to test the ordering experience.
              </p>
            </div>

            {/* Launch CTA */}
            <div className="mt-6">
              <Link
                href={`/t/${selectedTable.qr_token}`}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm bg-gold hover:bg-gold-deep text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <span>Launch Table {selectedTable.table_number} Experience</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-divider py-6 px-4 text-center text-xs text-ink-faint bg-white/50">
        <p>© 2026 Chai Partner Artisan Café · 25 Physical Dining Tables · Powered by NestJS & Next.js 14</p>
      </footer>
    </main>
  );
}
