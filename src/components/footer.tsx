import Link from 'next/link';
import { Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border/60">
      <div className="hr-soft" />
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap className="h-4 w-4 text-accent" />
            <div className="absolute inset-0 blur-md bg-accent/50 -z-10" />
          </div>
          <span className="font-mono font-semibold tracking-tight">LLM <span className="text-accent">Mart</span></span>
        </div>
        <nav className="flex items-center gap-5 text-text-faint">
          <Link href="/markets" className="hover:text-accent transition-colors">Marketplace</Link>
          <Link href="/buy" className="hover:text-accent transition-colors">Buy</Link>
          <Link href="/sell" className="hover:text-accent transition-colors">Sell</Link>
          <Link href="/docs" className="hover:text-accent transition-colors">Docs</Link>
        </nav>
      </div>
    </footer>
  );
}
