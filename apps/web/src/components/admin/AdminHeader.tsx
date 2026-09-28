'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Coffee,
  ClipboardList,
  UtensilsCrossed,
  History,
  BarChart3,
  Volume2,
  VolumeX,
  RefreshCw,
  LogOut,
  ShieldCheck,
  ChefHat,
  Receipt,
} from 'lucide-react';
import { AdminRole } from '@chai-partner/shared';

interface AdminHeaderProps {
  activeTab: 'orders' | 'menu' | 'history' | 'analytics';
  onRefresh?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export function AdminHeader({
  activeTab,
  onRefresh,
  soundEnabled,
  onToggleSound,
}: AdminHeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    name: string;
    role: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem('cp_admin_user');
    if (rawUser) {
      try {
        setCurrentUser(JSON.parse(rawUser));
      } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('cp_admin_token');
    localStorage.removeItem('cp_admin_user');
    router.push('/admin/login');
  };

  const getRoleBadge = (role: string = '') => {
    const r = role.toLowerCase();
    if (r === AdminRole.ADMIN) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-terracotta/10 text-terracotta border border-terracotta/25">
          <ShieldCheck className="w-3 h-3" />
          Admin
        </span>
      );
    }
    if (r === AdminRole.KITCHEN) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber/15 text-amber border border-amber/30">
          <ChefHat className="w-3 h-3" />
          Kitchen
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage/15 text-sage border border-sage/30">
        <Receipt className="w-3 h-3" />
        Cashier
      </span>
    );
  };

  return (
    <header className="mb-6 bg-surface border border-cream-dark/60 rounded-2xl p-4 shadow-xs no-print">
      {/* Top row: Brand + User Info + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cream-dark/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center text-terracotta border border-terracotta/20 shadow-xs">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-coffee">Chai Partner</h1>
              {getRoleBadge(currentUser?.role)}
            </div>
            <p className="text-xs font-medium text-sage">
              Signed in as <span className="font-semibold text-coffee">{currentUser?.name || 'Staff Member'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onToggleSound !== undefined && (
            <button
              onClick={onToggleSound}
              className="p-2 bg-cream/50 border border-cream-dark rounded-xl text-coffee hover:bg-cream transition-colors text-xs font-semibold flex items-center gap-1.5"
              title="Toggle Chime Sound"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-terracotta" />
              ) : (
                <VolumeX className="w-4 h-4 text-coffee/50" />
              )}
              <span className="hidden md:inline">{soundEnabled ? 'Chime ON' : 'Muted'}</span>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 bg-cream/50 border border-cream-dark rounded-xl text-coffee hover:bg-cream transition-colors text-xs font-semibold flex items-center gap-1.5"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-sage" />
              <span className="hidden md:inline">Refresh</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="p-2 bg-cream/50 border border-cream-dark rounded-xl text-error hover:bg-error-light transition-colors text-xs font-semibold flex items-center gap-1.5"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 sm:gap-2 pt-3">
        <Link
          href="/admin/orders"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'orders'
              ? 'bg-terracotta text-cream shadow-xs'
              : 'text-coffee/70 hover:text-coffee hover:bg-cream/60'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Live Orders Queue</span>
        </Link>

        <Link
          href="/admin/menu"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'menu'
              ? 'bg-terracotta text-cream shadow-xs'
              : 'text-coffee/70 hover:text-coffee hover:bg-cream/60'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Menu Management</span>
        </Link>

        <Link
          href="/admin/history"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-terracotta text-cream shadow-xs'
              : 'text-coffee/70 hover:text-coffee hover:bg-cream/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Order History</span>
        </Link>

        <Link
          href="/admin/analytics"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'analytics'
              ? 'bg-terracotta text-cream shadow-xs'
              : 'text-coffee/70 hover:text-coffee hover:bg-cream/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </Link>
      </nav>
    </header>
  );
}
