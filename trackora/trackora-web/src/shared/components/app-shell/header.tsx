import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Search,
  LogOut,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useAuthStore, useUser } from '@/features/auth/store';
import {
  useThemeStore,
  useResolvedTheme,
} from '@/features/auth/store/theme-store';
import { useUiStore } from '@/features/auth/store/ui-store';
import { tokenStore, refreshStore } from '@/shared/auth/token-store';

// ── Breadcrumb label from pathname ─────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Tasks',
  '/tasks/new': 'New Task',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/admin/users': 'Users',
  '/admin/roles': 'Roles',
};

function getBreadcrumb(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (/^\/tasks\/.+/.test(pathname)) return 'Task Details';
  return 'Page';
}

function getInitials(first?: string, last?: string) {
  return `${(first ?? '?').charAt(0)}${(last ?? '?').charAt(0)}`.toUpperCase();
}

function Header() {
  const user = useUser();
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const resolvedTheme = useResolvedTheme();
  const setTheme = useThemeStore((s) => s.setTheme);

  function handleLogout() {
    tokenStore.clear();
    refreshStore.clear();
    clear();
    navigate('/login');
  }

  function handleToggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 md:px-6">
      {/* Mobile hamburger / sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="shrink-0 transition-colors duration-200"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="hidden h-1.5 w-1.5 rounded-full bg-primary/60 md:block" />
        <h1 className="text-lg font-semibold tracking-tight">{getBreadcrumb(pathname)}</h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ⌘K Command palette search bar */}
      <button
        className="group hidden items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-muted/60 hover:shadow-[var(--shadow-glow)] md:flex"
        onClick={() => {
          /* placeholder for command palette */
        }}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors duration-200 group-hover:text-primary" />
        <span className="text-muted-foreground/70">Search…</span>
        <kbd className="pointer-events-none ml-6 hidden select-none rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleTheme}
        className="transition-all duration-200 hover:bg-accent"
        aria-label="Toggle theme"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-5 w-5 transition-transform duration-200 hover:rotate-45" />
        ) : (
          <Moon className="h-5 w-5 transition-transform duration-200 hover:-rotate-12" />
        )}
      </Button>

      {/* Notifications */}
      <Button
        variant="ghost"
        size="icon"
        className="relative transition-all duration-200 hover:bg-accent"
        onClick={() => navigate('/notifications')}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
      </Button>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full transition-all duration-200 hover:ring-2 hover:ring-primary/20">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {user
                  ? getInitials(user.first_name, user.last_name)
                  : '??'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 animate-scale-in">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user ? (user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email) : 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email ?? ''}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')} className="transition-colors duration-150">
            <UserIcon className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')} className="transition-colors duration-150">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive transition-colors duration-150 focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export { Header };
