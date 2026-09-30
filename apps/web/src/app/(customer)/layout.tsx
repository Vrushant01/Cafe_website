import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';
import { SessionGuard } from '@/components/ui/SessionGuard';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionGuard>
      {children}
    </SessionGuard>
  );
}
