'use client';

import { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Monitor, LogIn, LogOut, Loader2, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { GenreCard } from '@/components/onboarding/GenreCard';
import { APPLE_PODCAST_GENRES, APPLE_PODCAST_COUNTRIES } from '@/types/apple-podcasts';

interface UserProfile {
  display_name: string | null;
  preferred_genres: string[];
  preferred_country: string;
  onboarding_completed: boolean;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, isLoading: authLoading, signOut, setShowAuthModal } = useAuth();
  const { setCountry } = useCountry();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showGenreDialog, setShowGenreDialog] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  // Fetch profile when user changes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: nameInput.trim() }),
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setEditingName(false);
      }
    } catch (error) {
      console.error('Error updating name:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGenres = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_genres: Array.from(selectedGenres) }),
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setShowGenreDialog(false);
      }
    } catch (error) {
      console.error('Error updating genres:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCountry = async (countryCode: string) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_country: countryCode }),
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        // Sync the global country context so the feed updates immediately
        setCountry(countryCode.toUpperCase());
      }
    } catch (error) {
      console.error('Error updating country:', error);
    }
  };

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

  const openGenreDialog = () => {
    setSelectedGenres(new Set(profile?.preferred_genres || []));
    setShowGenreDialog(true);
  };

  const displayName = profile?.display_name
    || user?.user_metadata?.display_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || '';

  return (
    <div className="px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Customize your experience</p>
          </div>
        </div>

        {/* Theme Settings */}
        <Card variant="glass" className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                        theme === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Icon className={cn(
                        'h-5 w-5',
                        theme === option.value ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <span className={cn(
                        'text-sm font-medium',
                        theme === option.value ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Choose your preferred color scheme. System will follow your device settings.
              </p>
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card variant="glass" className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Account</h2>

          {authLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : !user ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm mb-4">
                Sign in to manage your account and personalize your experience.
              </p>
              <Button onClick={() => setShowAuthModal(true)} className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="text-sm font-medium mb-1 block">Display Name</label>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Enter display name"
                      className="max-w-xs"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSaveName} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{displayName}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setNameInput(displayName); setEditingName(true); }}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>

              {/* Preferred Genres */}
              <div>
                <label className="text-sm font-medium mb-2 block">Preferred Genres</label>
                {isLoadingProfile ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(profile?.preferred_genres || []).length > 0 ? (
                      <>
                        {profile!.preferred_genres.map(genreId => {
                          const genre = APPLE_PODCAST_GENRES.find(g => g.id === genreId);
                          return genre ? (
                            <span
                              key={genreId}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                            >
                              {genre.name}
                            </span>
                          ) : null;
                        })}
                        <Button size="sm" variant="ghost" onClick={openGenreDialog}>
                          Edit
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={openGenreDialog}>
                        Select genres
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Preferred Country */}
              <div>
                <label className="text-sm font-medium mb-1 block">Preferred Country</label>
                <select
                  value={profile?.preferred_country || 'us'}
                  onChange={(e) => handleSaveCountry(e.target.value)}
                  className="text-sm border border-border rounded-md px-3 py-2 bg-background"
                >
                  {APPLE_PODCAST_COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sign Out */}
              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={signOut}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card variant="glass" className="p-6 opacity-60">
          <h2 className="text-lg font-semibold mb-2">Notifications</h2>
          <p className="text-muted-foreground text-sm">
            Notification preferences coming soon.
          </p>
        </Card>
      </div>

      {/* Genre Selection Dialog */}
      <Dialog open={showGenreDialog} onOpenChange={setShowGenreDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogClose onClick={() => setShowGenreDialog(false)} />
          <DialogHeader>
            <DialogTitle>Select Your Preferred Genres</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
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
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {selectedGenres.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowGenreDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveGenres} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Genres
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
