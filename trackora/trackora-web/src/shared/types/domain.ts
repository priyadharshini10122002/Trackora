import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/shared/auth/permissions';

export interface MenuItem {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  icon?: LucideIcon;
}

export type Theme = 'light' | 'dark' | 'system';

export interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  roles?: Role[];
}
