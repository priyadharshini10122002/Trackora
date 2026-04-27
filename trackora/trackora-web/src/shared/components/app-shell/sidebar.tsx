import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Bell,
  Settings,
  Users,
  Shield,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Hexagon,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip';
import { useAuthStore, useUser, useRoles } from '@/features/auth/store';
import { useUiStore } from '@/features/auth/store/ui-store';
import { tokenStore, refreshStore } from '@/shared/auth/token-store';
import type { SidebarItem } from '@/shared/types/domain';
import type { Role } from '@/shared/auth/permissions';

// ── Navigation config ──────────────────────────────────────────────

const mainNav: SidebarItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const adminNav: SidebarItem[] = [
  { label: 'Users', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
  { label: 'Roles', href: '/admin/roles', icon: Shield, roles: ['ADMIN'] },
];

// ── Helpers ────────────────────────────────────────────────────────

function getInitials(first?: string, last?: string) {
  return `${(first ?? '?').charAt(0)}${(last ?? '?').charAt(0)}`.toUpperCase();
}

// ── Component ──────────────────────────────────────────────────────

function Sidebar() {
  const user = useUser();
  const roles = useRoles() as Role[];
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  const isAdmin = roles.includes('ADMIN');

  function handleLogout() {
    tokenStore.clear();
    refreshStore.clear();
    clear();
    navigate('/login');
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col text-white transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
          'border-r border-white/[0.06] bg-[hsl(228_18%_8%)] backdrop-blur-xl',
          collapsed ? 'w-[68px]' : 'w-[260px]',
        )}
      >
        {/* ── Brand ─────────────────────────────── */}
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <div
              className="absolute inset-0 rounded-lg opacity-40"
              style={{ boxShadow: '0 0 16px hsl(234 85% 60% / 0.4)' }}
            />
            <Hexagon className="relative h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight transition-opacity duration-200">Trackora</span>
          )}
        </div>

        {/* ── Navigation ────────────────────────── */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {mainNav.map((item) => (
            <SidebarNavLink key={item.href} item={item} collapsed={collapsed} />
          ))}

          {isAdmin && (
            <>
              <div className="my-4 px-2">
                <div className="h-px bg-white/[0.06]" />
                {!collapsed && (
                  <span className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Administration
                  </span>
                )}
              </div>
              {adminNav.map((item) => (
                <SidebarNavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                />
              ))}
            </>
          )}
        </nav>

        {/* ── Collapse toggle ───────────────────── */}
        <button
          onClick={toggleSidebar}
          className="flex h-10 items-center justify-center border-t border-white/[0.06] text-slate-500 transition-colors duration-200 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>

        {/* ── User section ──────────────────────── */}
        <div className="border-t border-white/[0.06] p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm transition-all duration-200',
                  'bg-white/[0.03] hover:bg-white/[0.07]',
                  'border border-white/[0.04] hover:border-white/[0.08]',
                  collapsed && 'justify-center px-0',
                )}
              >
                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/20 transition-shadow duration-200 hover:ring-primary/40">
                  <AvatarFallback className="bg-primary/20 text-xs text-primary-foreground">
                    {user
                      ? getInitials(user.first_name, user.last_name)
                      : '??'}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && user && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/90">
                      {user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={collapsed ? 'right' : 'top'}
              align="start"
              className="w-56"
            >
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// ── Nav link item ──────────────────────────────────────────────────

function SidebarNavLink({
  item,
  collapsed,
}: {
  item: SidebarItem;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-white/[0.08] text-white before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-r-full before:bg-primary before:shadow-[0_0_8px_hsl(234_85%_60%/0.5)]'
            : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-5 w-5 shrink-0 transition-colors duration-200', isActive && 'text-primary')} />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && item.badge !== undefined && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export { Sidebar };
