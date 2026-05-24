import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between text-xs text-text-faint">
        <Link href="/docs" className="hover:text-accent">docs</Link>
        <span>
          built by{' '}
          <a href="https://x.com/mac_eth" target="_blank" rel="noreferrer" className="hover:text-accent">
            @mac_eth
          </a>
        </span>
      </div>
    </footer>
  );
}
