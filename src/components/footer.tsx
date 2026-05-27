import Link from 'next/link';
import { BRAND_LOGO_URL } from '@/lib/brand';

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border/60">
      <div className="hr-soft" />
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="relative h-5 w-5">
            <img src={BRAND_LOGO_URL} alt="LLM Mart" className="h-5 w-5 rounded object-cover" />
            <div className="absolute inset-0 rounded blur-md bg-accent/30 -z-10" />
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
