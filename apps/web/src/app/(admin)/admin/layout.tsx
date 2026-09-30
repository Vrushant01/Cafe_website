'use client';

import { usePathname } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminHeaderProvider } from '@/contexts/AdminHeaderContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Do not wrap the login page in the authenticated shell
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Derive active tab from pathname
  let activeTab: any = 'orders';
  if (pathname.includes('/menu')) activeTab = 'menu';
  else if (pathname.includes('/history')) activeTab = 'history';
  else if (pathname.includes('/analytics')) activeTab = 'analytics';
  else if (pathname.includes('/staff')) activeTab = 'staff';

  return (
    <AdminHeaderProvider>
      <div className="min-h-screen bg-canvas flex flex-col font-sans">
        <AdminHeader activeTab={activeTab} />
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </AdminHeaderProvider>
  );
}
