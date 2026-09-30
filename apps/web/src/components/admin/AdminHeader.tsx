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
  Users,
  LogOut,
  RefreshCw,
  Volume2,
  VolumeX,
  LayoutGrid,
} from 'lucide-react';
import { AdminRole, Permission, hasPermission } from '@/lib/permissions';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';

interface AdminHeaderProps {
  activeTab: 'orders' | 'menu' | 'history' | 'analytics' | 'staff' | 'tables';
}

export function AdminHeader({ activeTab }: AdminHeaderProps) {
  const router = useRouter();
  const { onRefresh, soundEnabled, onToggleSound } = useAdminHeader();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<{ id?: string; name: string; role: string; email?: string } | null>(null);
  
  // Hydrate user strictly on client to avoid mismatch since this is a Layout now
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('cp_admin_user');
      if (rawUser) setCurrentUser(JSON.parse(rawUser));
    } catch {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('cp_admin_token');
    localStorage.removeItem('cp_admin_user');
    router.push('/admin/login');
  };

  const handleRefreshClick = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try { await onRefresh(); } finally { setTimeout(() => setIsRefreshing(false), 600); }
  };

  const currentRole = currentUser?.role?.toLowerCase() as AdminRole | undefined;

  const getRoleLabel = (role?: string) => {
    if (!role) return '';
    const r = role.toLowerCase();
    if (r === AdminRole.ADMIN) return 'OWNER / ADMIN';
    if (r === AdminRole.KITCHEN) return 'HEAD CHEF';
    return 'CASHIER / POS';
  };
  
  const getRoleLetter = (role?: string) => {
    if (!role) return '';
    const r = role.toLowerCase();
    if (r === AdminRole.ADMIN) return 'O';
    if (r === AdminRole.KITCHEN) return 'H';
    return 'C';
  };

  const allNavItems = [
    { tab: 'orders' as const, href: '/admin/orders', icon: ClipboardList, label: 'Live Queue', permission: 'orders.view' as Permission },
    { tab: 'menu' as const, href: '/admin/menu', icon: UtensilsCrossed, label: 'Menu', permission: 'menu.view' as Permission },
    { tab: 'history' as const, href: '/admin/history', icon: History, label: 'History', permission: 'orders.history' as Permission },
    { tab: 'analytics' as const, href: '/admin/analytics', icon: BarChart3, label: 'Analytics', permission: 'analytics.view' as Permission },
    { tab: 'staff' as const, href: '/admin/staff', icon: Users, label: 'Staff', permission: 'staff.manage' as Permission },
    { tab: 'tables' as const, href: '/admin/tables', icon: LayoutGrid, label: 'Tables', permission: 'tables.manage' as Permission },
  ];

  const visibleNavItems = allNavItems.filter((item) => {
    if (!currentRole) return false;
    return hasPermission(currentRole, item.permission);
  });

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-divider h-16 w-full no-print">
      <div className="grid grid-cols-3 items-center h-full max-w-[1600px] mx-auto px-6">
        
        {/* LEFT: Brand */}
        <Link href="/admin/orders" className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-surface border border-divider flex flex-col items-center justify-center text-accent">
            <Coffee className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-serif font-bold text-ink leading-tight">Chai Partner</span>
            <span className="text-[9px] font-sans font-bold uppercase tracking-[0.2em] text-accent leading-none mt-0.5">Operations</span>
          </div>
        </Link>

        {/* CENTER: Navigation */}
        <nav className="flex items-center justify-center gap-1">
          {visibleNavItems.map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <Link
                key={item.tab}
                href={item.href}
                className={`px-4 h-9 rounded-md text-sm font-sans font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                  isActive 
                    ? 'bg-canvas text-accent' 
                    : 'text-ink-muted hover:bg-canvas hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          
        </nav>

        {/* RIGHT: User Controls */}
        <div className="flex items-center justify-end gap-5">

          {/* Context Actions */}
          <div className="flex items-center gap-1">
            {onToggleSound !== undefined && (
              <button type="button" onClick={onToggleSound}
                className="h-8 w-8 rounded-md flex items-center justify-center transition-colors text-ink-muted hover:bg-canvas hover:text-ink"
                title={soundEnabled ? 'Mute Chime' : 'Enable Chime'}>
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}
            {onRefresh && (
              <button type="button" onClick={handleRefreshClick} disabled={isRefreshing}
                className="h-8 w-8 rounded-md flex items-center justify-center transition-colors text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-50"
                title="Refresh">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
              </button>
            )}
          </div>
          
          {(onToggleSound || onRefresh) && <div className="w-px h-6 bg-divider mx-1 hidden sm:block"></div>}

          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-sm font-sans font-bold text-ink leading-tight whitespace-nowrap">{currentUser.name}</span>
                <span className="text-[10px] font-sans font-semibold text-ink-muted uppercase tracking-wider mt-0.5 whitespace-nowrap">{getRoleLabel(currentUser.role)}</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-canvas border border-divider flex items-center justify-center text-sm font-bold text-ink">
                {getRoleLetter(currentUser.role)}
              </div>
            </div>
          )}

          <div className="w-px h-6 bg-divider mx-1 hidden sm:block"></div>

          <button onClick={handleLogout} className="text-ink-muted hover:text-danger transition-colors flex items-center gap-1.5 text-sm font-medium">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
          
        </div>
      </div>
    </header>
  );
}
