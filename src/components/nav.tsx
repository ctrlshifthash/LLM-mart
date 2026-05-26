'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { cn, shortAddr } from '@/lib/utils';
import { Zap, LogOut, ChevronRight } from 'lucide-react';

const TABS = [
  { href: '/', label: 'Home' },
  { href: '/buy', label: 'Buy' },
  { href: '/sell', label: 'Sell' },
  { href: '/markets', label: 'Marketplace' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/docs', label: 'Docs' },
] as const;

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const { ready, authenticated, user, login, logout } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated && search.get('login') === '1') login();
  }, [ready, authenticated, search, login]);

  const wallet =
    (user?.linkedAccounts as any[] | undefined)?.find(
      (a) => a?.type === 'wallet' && a?.chainType === 'solana',
    )?.address ||
    (user as any)?.wallet?.address ||
    null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/60 backdrop-blur-xl">
      {/* Social buttons pinned to the viewport's far-right edge (outside max-width container) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden sm:flex items-center pr-16 z-10">
        <div className="pointer-events-auto"><SocialButtons /></div>
      </div>
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-6">
        {/* Logo (left) */}
        <Link href="/" className="flex items-center gap-2 group justify-self-start">
          <div className="relative">
            <Zap className="h-5 w-5 text-accent transition-transform group-hover:scale-110 group-hover:rotate-12" />
            <div className="absolute inset-0 blur-md bg-accent/60 -z-10 group-hover:bg-accent/80 transition-colors" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight">
            LLM <span className="text-accent">Mart</span>
          </span>
        </Link>

        {/* Centered tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-border/70 bg-bg-card/60 backdrop-blur-sm p-1 shadow-[0_8px_30px_-10px_rgba(34,211,238,0.18)]">
          {TABS.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + '/');
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-medium transition-all',
                  active
                    ? 'bg-accent text-black shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)]'
                    : 'text-text-dim hover:text-text hover:bg-bg-card-hover/60',
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth (right) — reserves space for the absolutely-positioned social buttons on the far right */}
        <div className="flex items-center gap-5 justify-self-end sm:mr-[132px]">
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[10px] text-text-faint font-mono uppercase tracking-wider">
            <span className="dot pulse-dot" />
            {process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'mainnet-beta' ? 'mainnet' : 'devnet'}
          </span>
          {!ready ? (
            <div className="h-8 w-24 rounded-md bg-bg-card animate-pulse" />
          ) : authenticated ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs font-mono text-text">{shortAddr(wallet || user?.email?.address, 4)}</span>
                <span className="text-[10px] text-text-faint">{user?.email?.address ? 'email' : 'wallet'}</span>
              </div>
              <button
                onClick={() => { logout(); router.push('/'); }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-bg-card px-3 text-xs font-medium hover:bg-bg-card-hover transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => login()}
              className="group inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-xs font-semibold text-black btn-glow hover:bg-accent/90 transition-all"
            >
              Sign In
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile pills */}
      <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-4 pb-3 -mt-1">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + '/');
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap',
                active ? 'bg-accent text-black' : 'border border-border/70 bg-bg-card/60 text-text-dim',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function SocialButtons() {
  const items: { label: string; href: string; icon: React.ReactNode; tint: string }[] = [
    {
      label: 'Pump.fun',
      href: process.env.NEXT_PUBLIC_PUMPFUN_URL || 'https://pump.fun',
      tint: 'hover:border-success/60 hover:text-success hover:shadow-[0_8px_24px_-8px_rgba(74,222,128,0.5)]',
      icon: (
        <img
          src="https://static.wixstatic.com/media/e2da02_248e6293fa024f6e9dd4130271bb14c3~mv2.png"
          alt=""
          className="h-4 w-4 object-contain"
          aria-hidden
        />
      ),
    },
    {
      label: 'X',
      href: process.env.NEXT_PUBLIC_X_URL || 'https://x.com',
      tint: 'hover:border-text/60 hover:text-text hover:shadow-[0_8px_24px_-8px_rgba(255,255,255,0.3)]',
      icon: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
          <path d="M18.244 2H21l-6.52 7.45L22 22h-6.828l-4.78-6.247L4.8 22H2l6.97-7.96L2 2h6.914l4.32 5.71L18.244 2Zm-2.39 18h1.81L7.236 4H5.31l10.544 16Z" />
        </svg>
      ),
    },
    {
      label: 'GitHub',
      href: process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com',
      tint: 'hover:border-accent-2/60 hover:text-accent-2 hover:shadow-[0_8px_24px_-8px_rgba(129,140,248,0.5)]',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" clipRule="evenodd" d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.1.79-.25.79-.56v-2c-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.96 10.96 0 0 1 5.74 0c2.19-1.49 3.14-1.18 3.14-1.18.63 1.58.24 2.75.12 3.04.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
        </svg>
      ),
    },
  ];
  return (
    <div className="hidden sm:flex items-center gap-1.5">
      {items.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target="_blank"
          rel="noreferrer"
          aria-label={it.label}
          className={cn(
            'group relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-bg-card/60 text-text-dim transition-all duration-200 hover:-translate-y-0.5 hover:scale-110',
            it.tint,
          )}
        >
          {it.icon}
          <span className="pointer-events-none absolute top-full mt-2 whitespace-nowrap rounded-md border border-border/70 bg-bg-card/95 px-2 py-1 text-[10px] font-mono text-text opacity-0 backdrop-blur-sm transition-all duration-150 translate-y-[-4px] group-hover:opacity-100 group-hover:translate-y-0 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]">
            {it.label}
          </span>
        </a>
      ))}
    </div>
  );
}
