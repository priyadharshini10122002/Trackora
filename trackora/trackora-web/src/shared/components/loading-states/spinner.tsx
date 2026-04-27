import { cn } from '@/shared/lib/cn';
import { Loader2 } from 'lucide-react';

type SpinnerProps = {
  className?: string;
  size?: number;
};

function Spinner({ className, size = 24 }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', className)}
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}

export { Spinner };
export type { SpinnerProps };
