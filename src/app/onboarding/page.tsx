'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Sparkles, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GenreCard } from '@/components/onboarding/GenreCard';
import { useAuth } from '@/contexts/AuthContext';
import { APPLE_PODCAST_GENRES } from '@/types/apple-podcasts';

type Step = 'welcome' | 'genres' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const displayName = user?.user_metadata?.display_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'there';

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSkip = async () => {
    await saveAndFinish([]);
  };

  const handleFinishGenres = async () => {
    await saveAndFinish(Array.from(selectedGenres));
  };

  const saveAndFinish = async (genres: string[]) => {
    setIsSaving(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_genres: genres,
          onboarding_completed: true,
        }),
      });
      setStep('done');
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartExploring = () => {
    router.push('/discover');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['welcome', 'genres', 'done'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? 'w-8 bg-primary'
                  : i < ['welcome', 'genres', 'done'].indexOf(step)
                    ? 'w-8 bg-primary/40'
                    : 'w-8 bg-muted'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="glass" className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                  <Headphones className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-3">
                  Welcome to PodCatch, {displayName}!
                </h1>
                <p className="text-muted-foreground text-lg mb-2">
                  Your AI-powered podcast companion
                </p>
                <p className="text-muted-foreground mb-8">
                  Discover podcasts, get AI summaries, and never miss an insight.
                  Let&apos;s personalize your experience.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button onClick={() => setStep('genres')} className="gap-2 min-w-[200px]">
                    <Sparkles className="h-4 w-4" />
                    Personalize My Feed
                  </Button>
                  <Button variant="ghost" onClick={handleSkip} disabled={isSaving}>
                    Skip for now
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 'genres' && (
            <motion.div
              key="genres"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="glass" className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">What topics interest you?</h2>
                  <p className="text-muted-foreground">
                    Select at least 3 for best recommendations
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                  {APPLE_PODCAST_GENRES.map((genre) => (
                    <GenreCard
                      key={genre.id}
                      id={genre.id}
                      name={genre.name}
                      selected={selectedGenres.has(genre.id)}
                      onToggle={toggleGenre}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={handleSkip} disabled={isSaving}>
                    Skip
                  </Button>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {selectedGenres.size} selected
                    </span>
                    <Button
                      onClick={handleFinishGenres}
                      disabled={isSaving}
                      className="gap-2"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card variant="glass" className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6"
                >
                  <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-3">You&apos;re all set!</h2>
                <p className="text-muted-foreground mb-8">
                  {selectedGenres.size > 0
                    ? "We've personalized your discovery feed based on your interests."
                    : "You can always update your genre preferences in Settings."}
                </p>
                <Button onClick={handleStartExploring} className="gap-2 min-w-[200px]">
                  Start Exploring
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
