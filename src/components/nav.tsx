'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { cn, shortAddr } from '@/lib/utils';
import { Zap, LogOut } from 'lucide-react';

const TABS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/buy', label: 'Buy' },
  { href: '/sell', label: 'Sell' },
  { href: '/markets', label: 'Marketplace' },
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
    <header className="sticky top-0 z-40 border-b border-border bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
        <Link href="/markets" className="flex items-center gap-2 group">
          <div className="relative">
            <Zap className="h-5 w-5 text-accent transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 blur-md bg-accent/50 -z-10" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight">
            surplus<span className="text-accent">.</span>intel
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full border border-border bg-bg-card/60 p-1">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                  active ? 'bg-accent text-black' : 'text-text-dim hover:text-text',
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline-flex text-xs text-text-faint font-mono">
            {process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'mainnet-beta' ? 'mainnet' : 'devnet'}
          </span>
          {!ready ? (
            <div className="h-8 w-24 rounded-md bg-bg-card animate-pulse" />
          ) : authenticated ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-xs font-mono text-text">{shortAddr(wallet || user?.email?.address, 4)}</span>
                <span className="text-[10px] text-text-faint">{user?.email?.address ? 'email' : 'wallet'}</span>
              </div>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-bg-card px-3 text-xs font-medium hover:bg-bg-card-hover"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => login()}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-accent px-4 text-xs font-semibold text-black btn-glow hover:bg-accent/90"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
