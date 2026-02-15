'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { AuthModal } from '@/components/auth/AuthModal';
import { CompactAuthPrompt } from '@/components/auth/CompactAuthPrompt';
import { QueueToast } from '@/components/QueueToast';
import { StickyAudioPlayer } from '@/components/StickyAudioPlayer';
import { AskAIProvider } from '@/contexts/AskAIContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <AskAIProvider>
      <div className="min-h-screen">
        <Sidebar />
        <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen pb-24">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <AuthModal />
      <CompactAuthPrompt />
      <QueueToast />
      <StickyAudioPlayer />
    </AskAIProvider>
  );
}
