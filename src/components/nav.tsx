'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

const TABS = [
  { href: '/buy', label: 'Buy' },
  { href: '/sell', label: 'Sell' },
  { href: '/marketplace', label: 'Marketplace' },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Zap className="h-5 w-5 text-accent transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 blur-md bg-accent/50 -z-10" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight">surplus<span className="text-accent">.</span>intel</span>
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
          <span className="hidden sm:inline-flex text-xs text-text-faint font-mono">devnet</span>
          <button className="rounded-md border border-border-strong bg-bg-card px-4 py-1.5 text-xs font-medium hover:bg-bg-card-hover">
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
}
