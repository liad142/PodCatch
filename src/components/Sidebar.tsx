'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Radio,
  FileText,
  Bookmark,
  Settings,
  Headphones,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { glass } from '@/lib/glass';
import { SidebarUserSection } from '@/components/auth/SidebarUserSection';

// Navigation configuration - easy to edit
const NAV_ITEMS = [
  { label: 'Discover', href: '/discover', icon: Compass },
  { label: 'My Podcasts', href: '/my-podcasts', icon: Radio },
  { label: 'Episode Summaries', href: '/summaries', icon: FileText },
  { label: 'Saved', href: '/saved', icon: Bookmark },
  { label: 'Settings', href: '/settings', icon: Settings },
] as const;

interface NavItemProps {
  item: (typeof NAV_ITEMS)[number];
  isActive: boolean;
  onClick?: () => void;
}

function NavItem({ item, isActive, onClick }: NavItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-full text-base font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
        isActive
          ? 'bg-violet-50 text-violet-700 shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/my-podcasts') {
      // My Podcasts is active for both /my-podcasts and home /
      return pathname === '/my-podcasts' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-8">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <Headphones className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            PodCatch
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* Footer - User Status */}
      <div className="px-4 py-6 pb-8">
        <SidebarUserSection />
      </div>
    </div>
  );
}

function MobileDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Focus trap: focus first focusable element when opened
  const drawerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const firstFocusable = drawerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-[60] transition-opacity lg:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'fixed top-0 left-0 bottom-0 w-72 z-[60] transition-transform lg:hidden bg-white/95 backdrop-blur-xl border-r border-slate-100',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 p-2 rounded-lg transition-colors',
            'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          )}
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>

        <SidebarContent onNavigate={onClose} />
      </div>
    </>
  );
}

export function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Close mobile menu on route change
  const pathname = usePathname();
  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur border-b border-border z-50 lg:hidden">
        <div className="flex items-center justify-between h-full px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/" className="flex items-center gap-2">
            <Headphones className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              PodCatch
            </span>
          </Link>

          <SidebarUserSection compact />
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Desktop Sidebar */}
      <aside
        className="fixed top-0 left-0 bottom-0 w-64 hidden lg:flex flex-col z-30 bg-white/90 backdrop-blur-xl border-r border-slate-100"
        aria-label="Main navigation"
      >
        <SidebarContent />
      </aside>
    </>
  );
}

// Export nav items for documentation/reference
export { NAV_ITEMS };
