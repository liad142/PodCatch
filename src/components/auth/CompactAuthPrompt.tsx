'use client';

import { Info, LogIn, UserPlus } from 'lucide-react';
import { Toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function CompactAuthPrompt() {
  const { showCompactPrompt, setShowCompactPrompt, compactPromptMessage, setShowAuthModal } = useAuth();

  const handleSignIn = () => {
    setShowCompactPrompt(false);
    setShowAuthModal(true);
  };

  return (
    <Toast open={showCompactPrompt} onOpenChange={(open) => setShowCompactPrompt(open)} position="bottom">
      <div className="pr-8">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Info className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Sign in required</h3>
            <p className="text-xs text-muted-foreground">
              {compactPromptMessage || 'Only registered users can summarize episodes.'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSignIn}
            className="flex-1 gap-1.5"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSignIn}
            className="flex-1 gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Sign Up
          </Button>
        </div>
      </div>
    </Toast>
  );
}
