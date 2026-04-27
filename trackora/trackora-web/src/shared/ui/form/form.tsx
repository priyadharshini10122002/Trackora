import * as React from 'react';
import { cn } from '@/shared/lib/cn';
import { Label } from '@/shared/ui/label';

type FormFieldProps = {
  label?: string;
  htmlFor?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
  required?: boolean;
};

function FormField({
  label,
  htmlFor,
  error,
  className,
  children,
  required,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
export type { FormFieldProps };
