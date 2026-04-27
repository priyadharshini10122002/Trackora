import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  CheckCircle2,
  BarChart3,
  Shield,
  Zap,
  Clock,
  FileText,
  Star,
  Menu,
  X,
  Check,
} from 'lucide-react';

// ── Intersection Observer hook ─────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ── Animated counter ───────────────────────────────────────────────

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView(0.3);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ── Nav links config ───────────────────────────────────────────────

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Pricing', href: '#pricing' },
] as const;

// ── Features data ──────────────────────────────────────────────────

const features = [
  {
    icon: CheckCircle2,
    title: 'Task Orchestration',
    description: 'Multi-stage workflows with configurable approval chains that keep your projects moving without bottlenecks.',
    gradient: 'from-violet-500 to-indigo-500',
  },
  {
    icon: Clock,
    title: 'SLA Tracking',
    description: 'Real-time SLA monitoring with automatic breach alerts, ensuring every deadline is met and every commitment honored.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: BarChart3,
    title: 'Smart Dashboards',
    description: 'Customizable analytics and KPI tracking that surfaces insights, so you always know where your team stands.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Granular permissions and enterprise-grade security. Control who sees what, down to the individual field level.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    description: 'Automated routing, smart notifications, and escalation policies that eliminate manual handoffs.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: FileText,
    title: 'Audit Trail',
    description: 'Complete, immutable history of every action and change. Full compliance visibility for regulated industries.',
    gradient: 'from-purple-500 to-violet-500',
  },
];

// ── Steps data ─────────────────────────────────────────────────────

const steps = [
  {
    num: '01',
    title: 'Create',
    description: 'Set up tasks with priorities, deadlines, and SLA targets. Assign owners and define approval workflows in seconds.',
  },
  {
    num: '02',
    title: 'Orchestrate',
    description: 'Route tasks through multi-stage approval workflows automatically. No manual handoffs, no bottlenecks.',
  },
  {
    num: '03',
    title: 'Track',
    description: 'Monitor progress with real-time dashboards, SLA reports, and automated alerts. Always know where things stand.',
  },
];

// ── Testimonials data ──────────────────────────────────────────────

const testimonials = [
  {
    quote: 'Trackora transformed how our engineering team manages sprints. The SLA tracking alone saved us 20 hours per week.',
    name: 'Sarah Chen',
    title: 'VP Engineering',
    company: 'TechNova',
    initials: 'SC',
  },
  {
    quote: 'The approval workflow automation eliminated our manual routing. We now process 3x more requests with half the team.',
    name: 'Marcus Rivera',
    title: 'Operations Director',
    company: 'Meridian Industries',
    initials: 'MR',
  },
  {
    quote: 'Best task management platform we\'ve used. Clean UI, powerful features, enterprise-ready from day one.',
    name: 'Emily Watson',
    title: 'CTO',
    company: 'Apex Global',
    initials: 'EW',
  },
];

// ── Pricing data ───────────────────────────────────────────────────

const pricing = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'For small teams getting started',
    features: [
      'Up to 5 users',
      'Basic task management',
      'Kanban & list views',
      'Email notifications',
      'Community support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$12',
    period: '/user/mo',
    description: 'For growing teams that need more',
    badge: 'Most Popular',
    features: [
      'Unlimited users',
      'Advanced workflows',
      'SLA tracking & alerts',
      'Custom dashboards',
      'Priority support',
      'API access',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations at scale',
    features: [
      'Everything in Professional',
      'SSO / SAML integration',
      'Full audit logs',
      'Dedicated support',
      'Custom integrations',
      'On-premise option',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

// ── Trusted companies ──────────────────────────────────────────────

const trustedCompanies = ['Acme Corp', 'TechNova', 'Meridian', 'Apex Global', 'NexGen'];

// ── Mini Dashboard Illustration ────────────────────────────────────

function DashboardIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Glow behind */}
      <div
        className="pointer-events-none absolute -inset-8 opacity-50"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, hsl(234 85% 60% / 0.2) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[hsl(228_18%_8%)] shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/70" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <div className="h-3 w-3 rounded-full bg-green-500/70" />
          </div>
          <div className="ml-4 flex-1">
            <div className="mx-auto h-5 w-56 rounded-md bg-white/[0.06]" />
          </div>
        </div>

        <div className="flex">
          {/* Mini sidebar */}
          <div className="hidden w-48 border-r border-white/[0.06] p-3 sm:block">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/80" />
              <div className="h-3 w-16 rounded bg-white/20" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md bg-white/[0.08] px-2 py-1.5">
                <div className="h-3.5 w-3.5 rounded bg-primary/60" />
                <div className="h-2.5 w-16 rounded bg-white/30" />
              </div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <div className="h-3.5 w-3.5 rounded bg-white/10" />
                  <div className="h-2.5 rounded bg-white/10" style={{ width: `${48 + i * 8}px` }} />
                </div>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4">
            {/* Stats row */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Active', value: '128', color: 'bg-blue-500/20 text-blue-400' },
                { label: 'Completed', value: '847', color: 'bg-emerald-500/20 text-emerald-400' },
                { label: 'In Review', value: '23', color: 'bg-amber-500/20 text-amber-400' },
                { label: 'Overdue', value: '4', color: 'bg-red-500/20 text-red-400' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                  <div className="text-[10px] text-slate-500">{stat.label}</div>
                  <div className={`mt-1 text-lg font-bold ${stat.color.split(' ')[1]}`}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Kanban preview */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  title: 'To Do',
                  color: 'bg-slate-500',
                  cards: [
                    { text: 'API Integration', badge: 'High', badgeColor: 'bg-red-500/20 text-red-400' },
                    { text: 'UI Components', badge: 'Medium', badgeColor: 'bg-amber-500/20 text-amber-400' },
                  ],
                },
                {
                  title: 'In Progress',
                  color: 'bg-blue-500',
                  cards: [
                    { text: 'Auth Module', badge: 'High', badgeColor: 'bg-red-500/20 text-red-400' },
                    { text: 'Dashboard', badge: 'Low', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
                    { text: 'API Routes', badge: 'Medium', badgeColor: 'bg-amber-500/20 text-amber-400' },
                  ],
                },
                {
                  title: 'Done',
                  color: 'bg-emerald-500',
                  cards: [
                    { text: 'Database Schema', badge: 'Done', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
                    { text: 'CI Pipeline', badge: 'Done', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
                  ],
                },
              ].map((col) => (
                <div key={col.title} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className={`h-2 w-2 rounded-full ${col.color}`} />
                    <span className="text-[11px] font-medium text-slate-400">{col.title}</span>
                    <span className="ml-auto text-[10px] text-slate-600">{col.cards.length}</span>
                  </div>
                  {col.cards.map((card) => (
                    <div
                      key={card.text}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-2.5 transition-colors hover:bg-white/[0.06]"
                    >
                      <div className="text-[11px] font-medium text-slate-300">{card.text}</div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${card.badgeColor}`}>
                          {card.badge}
                        </span>
                        <div className="flex -space-x-1">
                          <div className="h-4 w-4 rounded-full bg-indigo-500/30 ring-1 ring-white/10" />
                          <div className="h-4 w-4 rounded-full bg-pink-500/30 ring-1 ring-white/10" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mini Kanban Illustration ───────────────────────────────────────

function KanbanIllustration() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-[hsl(228_18%_8%)] p-4 shadow-xl">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-3 rounded bg-primary/80" />
        <div className="h-2.5 w-20 rounded bg-white/20" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['To Do', 'In Progress', 'Done'].map((col, ci) => (
          <div key={col} className="space-y-1.5">
            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{col}</div>
            {[...Array(ci === 1 ? 3 : 2)].map((_, i) => (
              <div
                key={i}
                className="rounded-md border border-white/[0.06] bg-white/[0.04] p-2"
              >
                <div className="h-2 w-full rounded bg-white/10 mb-1.5" />
                <div className="h-2 w-2/3 rounded bg-white/[0.06]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini Analytics Illustration ────────────────────────────────────

function AnalyticsIllustration() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-[hsl(228_18%_8%)] p-4 shadow-xl">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-3 w-3 rounded bg-emerald-500/80" />
        <div className="h-2.5 w-24 rounded bg-white/20" />
      </div>
      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-24">
        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${h}%`,
              background: `linear-gradient(to top, hsl(234 85% 60% / 0.6), hsl(234 85% 60% / 0.2))`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[8px] text-slate-600">
        <span>Jan</span>
        <span>Jun</span>
        <span>Dec</span>
      </div>
    </div>
  );
}

// ── Mini Security Illustration ─────────────────────────────────────

function SecurityIllustration() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-[hsl(228_18%_8%)] p-4 shadow-xl">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-emerald-400" />
        <div className="h-2.5 w-20 rounded bg-white/20" />
      </div>
      <div className="space-y-2">
        {[
          { label: 'SSO / SAML', active: true },
          { label: 'MFA Enabled', active: true },
          { label: 'Encryption at Rest', active: true },
          { label: 'SOC 2 Compliant', active: true },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-2.5 w-2.5 text-emerald-400" />
            </div>
            <span className="text-[10px] font-medium text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section wrapper with scroll animation ──────────────────────────

function AnimatedSection({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <section
      ref={ref}
      id={id}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </section>
  );
}

// ── Logo SVG (same as login page) ──────────────────────────────────

function TrackoraLogo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════
// ██  LANDING PAGE COMPONENT
// ════════════════════════════════════════════════════════════════════

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleSmoothScroll = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      setMobileMenuOpen(false);
      const id = href.replace('#', '');
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    },
    [],
  );

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ══════════════ NAVIGATION ══════════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass border-b border-border/40 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
              <TrackoraLogo className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Trackora</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110"
            >
              Get Started Free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="glass animate-fade-in-down border-t border-border/40 md:hidden">
            <div className="space-y-1 px-4 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <div className="my-2 h-px bg-border" />
              <Link
                to="/login"
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="mt-2 block rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-center text-sm font-semibold text-white"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative overflow-hidden pt-16">
        {/* Dark dramatic background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, hsl(234 85% 12%) 0%, hsl(250 60% 16%) 30%, hsl(228 18% 6%) 70%, hsl(220 50% 10%) 100%)',
          }}
        />

        {/* Gradient mesh overlay */}
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
        <div
          className="pointer-events-none absolute left-[15%] top-[20%] h-72 w-72 animate-float rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, hsl(234 85% 60% / 0.3) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="pointer-events-none absolute right-[10%] top-[60%] h-56 w-56 rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, hsl(280 80% 60% / 0.25) 0%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'float 4s ease-in-out infinite 1s',
          }}
        />

        {/* Grid lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(234 85% 60% / 0.3) 1px, transparent 1px),' +
              'linear-gradient(90deg, hsl(234 85% 60% / 0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32 lg:px-8 lg:pt-40">
          {/* Badge */}
          <div className="animate-fade-in-up flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Now in public beta — Join 500+ teams
            </div>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up mx-auto mt-8 max-w-4xl text-center text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ animationDelay: '100ms' }}
          >
            Where Teams{' '}
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300 bg-clip-text text-transparent">
              Ship Faster
            </span>{' '}
            and{' '}
            <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Work Smarter
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-slate-400 sm:text-xl"
            style={{ animationDelay: '200ms' }}
          >
            The enterprise task orchestration platform that streamlines workflows,
            enforces SLAs, and gives your team complete visibility — from first
            assignment to final delivery.
          </p>

          {/* CTA buttons */}
          <div
            className="animate-fade-in-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: '300ms' }}
          >
            <Link
              to="/register"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:brightness-110"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-8 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/[0.1] hover:border-white/30">
              <Play className="h-4 w-4" />
              Watch Demo
            </button>
          </div>

          {/* Trusted by */}
          <div
            className="animate-fade-in-up mt-16 flex flex-col items-center gap-6"
            style={{ animationDelay: '400ms' }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Trusted by forward-thinking teams
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {trustedCompanies.map((company) => (
                <span
                  key={company}
                  className="text-base font-semibold tracking-wide text-slate-600 transition-colors hover:text-slate-400"
                >
                  {company}
                </span>
              ))}
            </div>
          </div>

          {/* Hero product mockup */}
          <div className="animate-fade-in-up mt-16 sm:mt-20" style={{ animationDelay: '500ms' }}>
            <DashboardIllustration />
          </div>
        </div>

        {/* Transition fade to white */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ══════════════ STATS BAR ══════════════ */}
      <AnimatedSection className="-mt-8 relative z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="glass-subtle grid grid-cols-2 gap-6 rounded-2xl border border-border/60 p-8 shadow-xl sm:grid-cols-4">
            {[
              { value: 10000, suffix: '+', label: 'Tasks Managed' },
              { value: 500, suffix: '+', label: 'Teams' },
              { value: 99.9, suffix: '%', label: 'Uptime' },
              { value: 4.9, suffix: '/5', label: 'Rating' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {stat.value === 99.9 || stat.value === 4.9 ? (
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  ) : (
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  )}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ══════════════ FEATURES ══════════════ */}
      <AnimatedSection id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your team needs to{' '}
              <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
                deliver faster
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Purpose-built for enterprise teams that need structure, visibility, and automation
              — without sacrificing speed.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="card-hover group rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <AnimatedSection id="how-it-works" className="bg-muted/30 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Three steps to{' '}
              <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
                orchestrated success
              </span>
            </h2>
          </div>

          <div className="relative mt-16 grid gap-8 sm:grid-cols-3">
            {/* Connecting line */}
            <div className="absolute top-16 left-[16.67%] right-[16.67%] hidden h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 sm:block" />

            {steps.map((step) => (
              <div key={step.num} className="relative text-center">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-primary/20 bg-background shadow-lg">
                  <span className="text-2xl font-bold text-primary">{step.num}</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ══════════════ PRODUCT SHOWCASE ══════════════ */}
      <AnimatedSection className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-24">
          {/* Item 1 */}
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                Flexible Views
              </p>
              <h3 className="mt-3 text-3xl font-bold tracking-tight">
                Powerful task views for every workflow
              </h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Kanban boards, list views, calendar views, and timeline views.
                Switch between perspectives instantly to see your work the way that
                makes sense for you.
              </p>
              <ul className="mt-6 space-y-3">
                {['Drag-and-drop kanban boards', 'Customizable list views', 'Timeline & Gantt charts'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <KanbanIllustration />
          </div>

          {/* Item 2 */}
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <AnalyticsIllustration />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                Analytics
              </p>
              <h3 className="mt-3 text-3xl font-bold tracking-tight">
                Real-time analytics that drive decisions
              </h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Custom dashboards, SLA reports, team velocity metrics, and trend
                analysis. Know exactly where your team stands — and where to improve.
              </p>
              <ul className="mt-6 space-y-3">
                {['Custom KPI dashboards', 'SLA compliance reports', 'Team velocity tracking'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Item 3 */}
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                Security
              </p>
              <h3 className="mt-3 text-3xl font-bold tracking-tight">
                Enterprise security you can trust
              </h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                SOC 2 compliant, end-to-end encryption, SSO/SAML, and granular
                role-based access control. Built for organizations that take security
                seriously.
              </p>
              <ul className="mt-6 space-y-3">
                {['SSO & SAML integration', 'End-to-end encryption', 'SOC 2 Type II compliance'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <SecurityIllustration />
          </div>
        </div>
      </AnimatedSection>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <AnimatedSection id="testimonials" className="bg-muted/30 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Testimonials
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by teams{' '}
              <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
                everywhere
              </span>
            </h2>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="card-hover glass-subtle rounded-2xl border border-border/60 p-6 shadow-[var(--shadow-card)]"
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-indigo-500/80 text-xs font-bold text-white">
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.title}, {t.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ══════════════ PRICING ══════════════ */}
      <AnimatedSection id="pricing" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free, upgrade when you&apos;re ready. No hidden fees, no surprises.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`card-hover relative flex flex-col rounded-2xl border p-8 shadow-[var(--shadow-card)] ${
                  plan.highlighted
                    ? 'border-primary/50 bg-card ring-1 ring-primary/20'
                    : 'border-border/60 bg-card'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-blue-500/25">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.name === 'Enterprise' ? '/register' : '/register'}
                  className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:brightness-110'
                      : 'border border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ══════════════ FINAL CTA ══════════════ */}
      <AnimatedSection className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-16 sm:py-24"
            style={{
              background:
                'linear-gradient(135deg, hsl(234 85% 12%) 0%, hsl(250 60% 16%) 30%, hsl(228 18% 6%) 70%, hsl(220 50% 10%) 100%)',
            }}
          >
            {/* Mesh overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  'radial-gradient(ellipse 60% 50% at 30% 30%, hsl(234 85% 60% / 0.2) 0%, transparent 60%),' +
                  'radial-gradient(ellipse 50% 60% at 70% 70%, hsl(280 80% 60% / 0.12) 0%, transparent 60%)',
              }}
            />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ready to orchestrate your <br className="hidden sm:block" />
                team&apos;s success?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
                Join hundreds of teams who are already shipping faster with Trackora.
                Get started in minutes — no credit card required.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:brightness-110"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-8 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/[0.1] hover:border-white/30"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="border-t border-border/60 bg-muted/20 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
                  <TrackoraLogo className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">Trackora</span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Enterprise task orchestration platform built for ambitious teams
                that need structure, speed, and visibility.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold">Product</h4>
              <ul className="mt-4 space-y-2.5">
                {['Features', 'Pricing', 'Roadmap', 'Changelog'].map((item) => (
                  <li key={item}>
                    <span className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold">Company</h4>
              <ul className="mt-4 space-y-2.5">
                {['About', 'Careers', 'Blog', 'Contact'].map((item) => (
                  <li key={item}>
                    <span className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources & Legal */}
            <div>
              <h4 className="text-sm font-semibold">Resources</h4>
              <ul className="mt-4 space-y-2.5">
                {['Documentation', 'API Reference', 'Privacy Policy', 'Terms of Service'].map(
                  (item) => (
                    <li key={item}>
                      <span className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {item}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border/60 pt-8">
            <p className="text-center text-sm text-muted-foreground">
              &copy; 2026 Trackora. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
