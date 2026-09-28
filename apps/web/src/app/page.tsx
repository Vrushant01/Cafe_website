'use client';

import Link from 'next/link';
import { Coffee, QrCode, ShieldCheck, ArrowRight, Utensils } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-6 max-w-md mx-auto">
      {/* Brand Header */}
      <header className="w-full text-center pt-8">
        <div className="w-16 h-16 bg-surface rounded-2xl mx-auto flex items-center justify-center shadow-sm border border-terracotta/20 mb-4 text-terracotta">
          <Coffee className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-coffee tracking-tight">CHAI PARTNER</h1>
        <p className="text-sage text-sm mt-1 font-medium">Table-Bound Ordering & Live Tracking</p>
      </header>

      {/* Main Info Card */}
      <div className="w-full bg-surface border border-terracotta/20 rounded-2xl p-6 shadow-sm text-center my-6">
        <div className="w-12 h-12 bg-cream rounded-full mx-auto flex items-center justify-center text-terracotta mb-3">
          <QrCode className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-coffee">Scan Your Table QR Code</h2>
        <p className="text-sm text-coffee/70 mt-1 leading-relaxed">
          Please scan the unique QR code placed on your cafe table to verify your seat and view the menu.
        </p>

        {/* Demo Fast Access */}
        <div className="mt-6 pt-5 border-t border-cream-dark/60 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-sage block mb-2">
            Demo / Testing Quick Access
          </span>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/t/table_1_f5e6a203f169f4bc"
              className="flex items-center justify-between p-3 bg-cream/60 hover:bg-cream rounded-xl text-xs font-semibold text-coffee transition-colors border border-terracotta/10"
            >
              <span>Table 1 (2 seats)</span>
              <ArrowRight className="w-3.5 h-3.5 text-terracotta" />
            </Link>
            <Link
              href="/t/table_5_44615a6b0c60da2f"
              className="flex items-center justify-between p-3 bg-cream/60 hover:bg-cream rounded-xl text-xs font-semibold text-coffee transition-colors border border-terracotta/10"
            >
              <span>Table 5 (2 seats)</span>
              <ArrowRight className="w-3.5 h-3.5 text-terracotta" />
            </Link>
          </div>
        </div>
      </div>

      {/* Admin / Staff Access Link */}
      <footer className="w-full text-center pb-6">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs font-medium text-sage hover:text-terracotta transition-colors py-2 px-4 rounded-full border border-sage/20 bg-surface/50"
        >
          <ShieldCheck className="w-4 h-4 text-terracotta" />
          <span>Staff & Kitchen Dashboard</span>
        </Link>
      </footer>
    </main>
  );
}
