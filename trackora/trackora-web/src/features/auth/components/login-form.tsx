import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { FormField } from '@/shared/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { cn } from '@/shared/lib/cn';
import { useLogin } from '@/features/auth/api/use-login';
import type { ApiError } from '@/shared/api/error';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(values: LoginFormValues) {
    login.mutate(values, {
      onSuccess: () => {
        navigate('/', { replace: true });
      },
    });
  }

  const serverError = login.error as ApiError | null;

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl shadow-black/5 backdrop-blur-sm">
      <CardHeader className="space-y-3 pb-2 text-center">
        {/* Logo */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-7 w-7 text-white"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Sign in to your account
          </CardTitle>
          <CardDescription className="mt-1.5 text-sm text-muted-foreground">
            Enter your credentials to access Trackora
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4 px-6 pb-2">
          {/* Server error */}
          {serverError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 shrink-0"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{serverError.message ?? 'Invalid email or password'}</span>
            </div>
          )}

          {/* Email */}
          <FormField
            label="Email address"
            htmlFor="email"
            error={errors.email?.message}
            required
          >
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                className="pl-10"
                error={!!errors.email}
                {...register('email')}
              />
            </div>
          </FormField>

          {/* Password */}
          <FormField
            label="Password"
            htmlFor="password"
            error={errors.password?.message}
            required
          >
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pl-10 pr-10"
                error={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormField>

          {/* Remember me & forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label
                htmlFor="remember"
                className="cursor-pointer text-sm font-normal text-muted-foreground"
              >
                Remember me
              </Label>
            </div>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 px-6 pb-6 pt-2">
          <Button
            type="submit"
            className={cn(
              'w-full font-semibold',
              'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25',
              'hover:from-blue-700 hover:to-indigo-700',
              'transition-all duration-200',
            )}
            disabled={login.isPending}
          >
            {login.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              Create account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
