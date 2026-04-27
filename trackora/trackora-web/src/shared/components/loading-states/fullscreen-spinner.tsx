import { cn } from '@/shared/lib/cn';
import { Spinner } from './spinner';

type FullscreenSpinnerProps = {
  className?: string;
  label?: string;
};

function FullscreenSpinner({
  className,
  label = 'Loading…',
}: FullscreenSpinnerProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm',
        className,
      )}
      role="status"
      aria-label={label}
    >
      <Spinner size={32} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export { FullscreenSpinner };
export type { FullscreenSpinnerProps };
