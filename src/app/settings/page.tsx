'use client';

import { Settings, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

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
        <section className="rounded-lg border bg-card p-6 mb-6">
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
        </section>

        {/* Coming Soon Sections */}
        <section className="rounded-lg border bg-card p-6 mb-6 opacity-60">
          <h2 className="text-lg font-semibold mb-2">Account</h2>
          <p className="text-muted-foreground text-sm">
            Account settings and preferences coming soon.
          </p>
        </section>

        <section className="rounded-lg border bg-card p-6 opacity-60">
          <h2 className="text-lg font-semibold mb-2">Notifications</h2>
          <p className="text-muted-foreground text-sm">
            Notification preferences coming soon.
          </p>
        </section>
      </div>
    </div>
  );
}
