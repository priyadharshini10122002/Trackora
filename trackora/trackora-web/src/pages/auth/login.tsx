import {
  CheckCircle2,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { LoginForm } from '@/features/auth/components/login-form';

const features = [
  {
    icon: CheckCircle2,
    title: 'Task Orchestration',
    description: 'Multi-stage approval workflows with full audit trail',
    color: 'from-violet-500/20 to-indigo-500/20',
    iconColor: 'text-violet-300',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'SLA tracking, performance metrics, and custom dashboards',
    color: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-300',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Role-based access control with granular permissions',
    color: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-300',
  },
  {
    icon: Zap,
    title: 'Automation',
    description: 'Smart notifications and automated task routing',
    color: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-300',
  },
];

function LoginPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Brand panel (hidden on mobile) ──────────────────────────── */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{
          background: 'linear-gradient(135deg, hsl(234 85% 12%) 0%, hsl(250 60% 16%) 30%, hsl(228 18% 6%) 70%, hsl(220 50% 10%) 100%)',
        }}
      >
        {/* Animated gradient mesh overlay */}
        <div
          className="pointer-events-none absolute inset-0 animate-gradient opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 20%, hsl(234 85% 60% / 0.15) 0%, transparent 60%),' +
              'radial-gradient(ellipse 60% 80% at 80% 80%, hsl(280 80% 60% / 0.1) 0%, transparent 60%),' +
              'radial-gradient(ellipse 50% 50% at 60% 30%, hsl(200 90% 48% / 0.08) 0%, transparent 60%)',
            backgroundSize: '200% 200%',
          }}
        />

        {/* Floating orbs */}
        <div className="pointer-events-none absolute left-[15%] top-[20%] h-72 w-72 animate-float rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, hsl(234 85% 60% / 0.3) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div className="pointer-events-none absolute right-[10%] top-[60%] h-56 w-56 rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, hsl(280 80% 60% / 0.25) 0%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'float 4s ease-in-out infinite 1s',
          }}
        />
        <div className="pointer-events-none absolute bottom-[15%] left-[40%] h-40 w-40 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, hsl(200 90% 48% / 0.3) 0%, transparent 70%)',
            filter: 'blur(30px)',
            animation: 'float 5s ease-in-out infinite 0.5s',
          }}
        />

        {/* Subtle grid lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(234 85% 60% / 0.3) 1px, transparent 1px),' +
              'linear-gradient(90deg, hsl(234 85% 60% / 0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Logo + tagline */}
        <div className="relative z-10 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm">
              <div className="absolute inset-0 rounded-xl animate-pulse-glow" />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="relative h-6 w-6 text-white"
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
            <span className="text-2xl font-bold tracking-tight">Trackora</span>
          </div>
          <h2 className="mt-8 max-w-sm text-3xl font-bold leading-tight tracking-tight">
            Enterprise Task
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300 bg-clip-text text-transparent"> Orchestration </span>
            Platform
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            Streamline workflows, enforce SLAs, and gain complete visibility
            across your organization.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="stagger-children relative z-10 space-y-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.06]"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${f.color} border border-white/10 transition-transform duration-300 group-hover:scale-110`}>
                <f.icon className={`h-5 w-5 ${f.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold leading-tight text-white/90">{f.title}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {f.description}
                </p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-slate-400" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-slate-600">
          &copy; {new Date().getFullYear()} Trackora &mdash; All rights
          reserved.
        </p>
      </div>

      {/* ── Form panel ──────────────────────────────────────────────── */}
      <div className="relative flex w-full flex-1 items-center justify-center bg-background px-4 lg:w-1/2">
        {/* Dot grid background */}
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />

        {/* Subtle gradient accent */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(234 85% 60% / 0.06) 0%, transparent 60%)',
          }}
        />

        <div className="animate-scale-in relative z-10 w-full max-w-md">
          <div className="glass rounded-2xl p-8 shadow-[var(--shadow-card)]">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
