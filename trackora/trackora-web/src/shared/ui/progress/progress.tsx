import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

const progressIndicatorVariants = cva(
  'h-full w-full flex-1 transition-all',
  {
    variants: {
      tone: {
        default: 'bg-primary',
        warning: 'bg-warning',
        destructive: 'bg-destructive',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

type ProgressProps = React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> &
  VariantProps<typeof progressIndicatorVariants>;

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, tone, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(progressIndicatorVariants({ tone }))}
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, progressIndicatorVariants };
export type { ProgressProps };
