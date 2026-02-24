'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Compass,
  Library,
  BookOpen,
  Bookmark,
  Settings,
  Headphones,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SidebarUserSection } from '@/components/auth/SidebarUserSection';

const ROOT_PATHS = ['/', '/discover', '/my-podcasts', '/summaries', '/saved', '/settings', '/onboarding'];

// Navigation configuration - easy to edit
const NAV_ITEMS = [
  { label: 'Discover', href: '/discover', icon: Compass },
  { label: 'My Podcasts', href: '/my-podcasts', icon: Library },
  { label: 'Summaries', href: '/summaries', icon: BookOpen },
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
        'h-10 px-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isActive
          ? 'bg-primary-subtle text-primary'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
      <span className="text-sm font-medium">{item.label}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/my-podcasts') {
      // My Podcasts is active for both /my-podcasts and home /
      return pathname === '/my-podcasts' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const isRoot = ROOT_PATHS.some(p => pathname === p);

  return (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <Headphones className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-foreground">
            PodCatch
          </span>
        </Link>
      </div>

      {/* Separator */}
      <div className="border-b border-border mb-4 mx-5" />

      {/* Back Button - shown on sub-pages */}
      {!isRoot && (
        <div className="px-3 pb-2">
          <button
            onClick={() => { router.back(); onNavigate?.(); }}
            className="h-10 px-3 rounded-xl flex items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            Back
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto" aria-label="Main navigation">
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
      <div className="px-4 py-4 pb-6">
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
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity lg:hidden',
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
          'fixed top-0 left-0 bottom-0 w-64 z-[60] transition-transform lg:hidden bg-background border-r border-border',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 p-2 rounded-lg transition-colors',
            'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
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

// Mobile bottom navigation bar items (shorter labels for compact display)
const BOTTOM_NAV_ITEMS = [
  { label: 'Discover', href: '/discover', icon: Compass },
  { label: 'Podcasts', href: '/my-podcasts', icon: Library },
  { label: 'Summaries', href: '/summaries', icon: BookOpen },
  { label: 'Saved', href: '/saved', icon: Bookmark },
  { label: 'Settings', href: '/settings', icon: Settings },
] as const;

function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/my-podcasts') {
      return pathname === '/my-podcasts' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border h-14 lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-full px-2">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 min-w-0 px-2',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Close mobile menu on route change
  const pathname = usePathname();
  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  const isRoot = ROOT_PATHS.some(p => pathname === p);

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-50 lg:hidden">
        <div className="flex items-center justify-between h-full px-4">
          {isRoot ? (
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
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <Link href="/" className="flex items-center gap-2">
            <Headphones className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">
              PodCatch
            </span>
          </Link>

          <SidebarUserSection compact />
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Desktop Sidebar */}
      <aside
        className="fixed top-0 left-0 bottom-0 w-64 hidden lg:flex flex-col z-30 bg-background border-r border-border"
        aria-label="Main navigation"
      >
        <SidebarContent />
      </aside>
    </>
  );
}

// Export nav items for documentation/reference
export { NAV_ITEMS };
