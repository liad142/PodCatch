'use client';

import { Sparkles, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function CompactAuthPrompt() {
  const { showCompactPrompt, setShowCompactPrompt, setShowAuthModal } = useAuth();

  const handleSignUp = () => {
    setShowCompactPrompt(false);
    setShowAuthModal(true);
  };

  if (!showCompactPrompt) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={() => setShowCompactPrompt(false)}
      />

      {/* Modal — centered in the content area */}
      <div className={cn(
        'fixed z-50 w-full max-w-md px-4',
        'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'lg:left-[calc(50%+8rem)]',
        'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200'
      )}>
        <div className="relative rounded-2xl bg-card border border-border shadow-2xl p-8 text-center">
          {/* Close */}
          <button
            onClick={() => setShowCompactPrompt(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30 mb-6">
            <Sparkles className="h-8 w-8 text-white fill-white/20" />
          </div>

          {/* Text */}
          <h3 className="text-xl font-bold mb-2">Unlock AI Summaries</h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto leading-relaxed">
            Sign up to generate summaries, key insights, and chapter breakdowns for any podcast episode.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              size="lg"
              onClick={handleSignUp}
              className="w-full gap-2 rounded-full bg-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-base"
            >
              <UserPlus className="h-5 w-5" />
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
