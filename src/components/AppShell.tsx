'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/Sidebar';
import { StickyAudioPlayer } from '@/components/StickyAudioPlayer';
import { AskAIProvider } from '@/contexts/AskAIContext';

// Dynamic imports for components that only appear on user interaction
const AuthModal = dynamic(() => import('@/components/auth/AuthModal').then(m => ({ default: m.AuthModal })), { ssr: false });
const CompactAuthPrompt = dynamic(() => import('@/components/auth/CompactAuthPrompt').then(m => ({ default: m.CompactAuthPrompt })), { ssr: false });
const QueueToast = dynamic(() => import('@/components/QueueToast').then(m => ({ default: m.QueueToast })), { ssr: false });
const AskAIChatPopup = dynamic(() => import('@/components/insights/AskAIChatPopup').then(m => ({ default: m.AskAIChatPopup })), { ssr: false });
const AnalyticsTracker = dynamic(() => import('@/components/AnalyticsTracker').then(m => ({ default: m.AnalyticsTracker })), { ssr: false });

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
      <AskAIChatPopup />
      <AnalyticsTracker />
    </AskAIProvider>
  );
}
