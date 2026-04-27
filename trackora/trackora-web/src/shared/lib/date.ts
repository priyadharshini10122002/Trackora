import { formatDistanceToNow, format } from 'date-fns';

/** "2 hours ago", "in 3 days" */
export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** "Dec 3, 2025 at 2:30 PM" */
export function formatAbsolute(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

/** "Dec 3, 2025" */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}
