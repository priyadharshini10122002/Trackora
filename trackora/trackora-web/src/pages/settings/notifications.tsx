import { useState } from 'react';
import { Bell, Monitor, Moon, Sun, Maximize, Minimize } from 'lucide-react';
import { PageHeader } from '@/shared/components/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Switch,
  Label,
  Separator,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useThemeStore } from '@/features/auth/store/theme-store';
import { useUiStore } from '@/features/auth/store/ui-store';
import type { Theme } from '@/shared/types/domain';
import { toast } from 'sonner';

type NotificationPreference = {
  key: string;
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
};

const DEFAULT_PREFS: NotificationPreference[] = [
  {
    key: 'task_assigned',
    label: 'Task assigned to me',
    description: 'When a task is assigned to you',
    email: true,
    inApp: true,
  },
  {
    key: 'task_status_changed',
    label: 'Task status changed',
    description: 'When a task you created or are assigned to changes status',
    email: true,
    inApp: true,
  },
  {
    key: 'task_commented',
    label: 'New comment',
    description: 'When someone comments on your task',
    email: false,
    inApp: true,
  },
  {
    key: 'task_approved',
    label: 'Task approved',
    description: 'When your submitted task is approved',
    email: true,
    inApp: true,
  },
  {
    key: 'task_rejected',
    label: 'Task rejected',
    description: 'When your submitted task is rejected',
    email: true,
    inApp: true,
  },
  {
    key: 'task_overdue',
    label: 'Task overdue',
    description: 'When a task passes its due date',
    email: true,
    inApp: true,
  },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function SettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreference[]>(DEFAULT_PREFS);
  const { theme, setTheme } = useThemeStore();
  const { density, setDensity } = useUiStore();

  function handleToggle(
    key: string,
    channel: 'email' | 'inApp',
    checked: boolean,
  ) {
    setPrefs((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [channel]: checked } : p)),
    );
    toast.success('Preference updated');
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your preferences and account settings"
      />

      {/* Notification Preferences */}
      <Card className="glass-subtle border-border/50 shadow-[var(--shadow-card)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about task activity
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_80px_80px] items-center gap-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Event</span>
              <span className="text-center">Email</span>
              <span className="text-center">In-app</span>
            </div>
            <Separator className="opacity-50" />
            {prefs.map((pref) => (
              <div
                key={pref.key}
                className="grid grid-cols-[1fr_80px_80px] items-center gap-4 rounded-lg py-3 px-2 transition-colors duration-150 hover:bg-muted/30"
              >
                <div>
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {pref.description}
                  </p>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.email}
                    onCheckedChange={(checked: boolean) =>
                      handleToggle(pref.key, 'email', checked)
                    }
                    aria-label={`${pref.label} email notification`}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.inApp}
                    onCheckedChange={(checked: boolean) =>
                      handleToggle(pref.key, 'inApp', checked)
                    }
                    aria-label={`${pref.label} in-app notification`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="glass-subtle border-border/50 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme selector */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Theme</Label>
            <div className="flex gap-3">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 px-6 py-4 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'border-primary bg-primary/5 text-primary shadow-[var(--shadow-glow)]'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/30',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Density toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Density</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={cn(
                  'flex items-center gap-2 rounded-xl border-2 px-6 py-3 text-sm font-medium transition-all duration-200',
                  density === 'comfortable'
                    ? 'border-primary bg-primary/5 text-primary shadow-[var(--shadow-glow)]'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/30',
                )}
              >
                <Maximize className="h-4 w-4" />
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={cn(
                  'flex items-center gap-2 rounded-xl border-2 px-6 py-3 text-sm font-medium transition-all duration-200',
                  density === 'compact'
                    ? 'border-primary bg-primary/5 text-primary shadow-[var(--shadow-glow)]'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/30',
                )}
              >
                <Minimize className="h-4 w-4" />
                Compact
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;
