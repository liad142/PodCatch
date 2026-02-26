'use client';

import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

interface SignInPromptProps {
  message?: string;
  description?: string;
}

export function SignInPrompt({
  message = 'Sign up to access this feature',
  description = 'Create a free account to unlock personalized features like subscriptions, saved content, and your feed.',
}: SignInPromptProps) {
  const { setShowAuthModal } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <UserPlus className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{message}</h2>
        <p className="text-muted-foreground text-sm mb-6">{description}</p>
        <Button onClick={() => setShowAuthModal(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Sign Up
        </Button>
      </Card>
    </div>
  );
}
