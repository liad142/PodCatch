'use client';

import { useState } from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SidebarUserSectionProps {
  compact?: boolean;
}

export function SidebarUserSection({ compact = false }: SidebarUserSectionProps) {
  const { user, isLoading, signOut, setShowAuthModal } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
        <Skeleton className="w-8 h-8 rounded-full" />
        {!compact && (
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    if (compact) {
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAuthModal(true)}
          aria-label="Sign in"
        >
          <User className="h-5 w-5" />
        </Button>
      );
    }

    return (
      <div className="space-y-2">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => setShowAuthModal(true)}
        >
          <User className="h-4 w-4" />
          Sign In
        </Button>
        <button
          onClick={() => setShowAuthModal(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left px-1"
        >
          New here? Create an account
        </button>
      </div>
    );
  }

  const displayName = user.user_metadata?.display_name
    || user.user_metadata?.full_name
    || user.email?.split('@')[0]
    || 'User';
  const email = user.email || '';
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initials = displayName.charAt(0).toUpperCase();

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
          aria-label="User menu"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <span className="text-sm font-medium text-primary">{initials}</span>
          )}
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 bottom-full mb-2 w-48 rounded-lg border border-border bg-background shadow-lg z-50 py-1">
              <Link
                href="/settings"
                onClick={() => setShowDropdown(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                onClick={() => { signOut(); setShowDropdown(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors w-full text-left text-red-600 dark:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors w-full text-left',
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span className="text-sm font-medium text-primary">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform',
          showDropdown && 'rotate-180'
        )} />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute left-0 right-0 bottom-full mb-2 rounded-lg border border-border bg-background shadow-lg z-50 py-1">
            <Link
              href="/settings"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={() => { signOut(); setShowDropdown(false); }}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors w-full text-left text-red-600 dark:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
