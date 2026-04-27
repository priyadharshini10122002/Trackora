import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui/button';

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 text-center">
      {/* Floating decorative elements */}
      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-20 opacity-30"
          style={{
            background:
              'radial-gradient(circle, hsl(234 85% 60% / 0.15) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />

        <div className="relative animate-fade-in-up">
          <h1 className="text-[8rem] font-black leading-none tracking-tighter bg-gradient-to-b from-foreground via-foreground/80 to-foreground/20 bg-clip-text text-transparent">
            404
          </h1>

          {/* Floating dots decoration */}
          <div className="absolute -top-4 -right-4 h-3 w-3 rounded-full bg-primary/40 animate-float" />
          <div
            className="absolute -bottom-2 -left-6 h-2 w-2 rounded-full bg-primary/30"
            style={{ animation: 'float 3s ease-in-out infinite 0.5s' }}
          />
          <div
            className="absolute top-1/2 -right-8 h-2.5 w-2.5 rounded-full bg-primary/20"
            style={{ animation: 'float 4s ease-in-out infinite 1s' }}
          />
        </div>
      </div>

      <div className="animate-fade-in-up space-y-2" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xl font-semibold tracking-tight">
          Page not found
        </h2>
        <p className="max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <Button
          asChild
          size="lg"
          className="gap-2 shadow-[var(--shadow-glow)] transition-all duration-200 hover:shadow-[var(--shadow-glow)]"
        >
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default NotFoundPage;
