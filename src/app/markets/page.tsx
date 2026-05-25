import { MarketplaceTable } from '@/components/marketplace-table';

export default function MarketsPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-bg-card/60 backdrop-blur px-3 py-1 text-[11px] text-text-dim reveal">
            <span className="dot pulse-dot" /> Live USDC pricing · all modalities
          </div>
          <h1 className="reveal reveal-delay-1 mt-5 text-4xl sm:text-6xl font-semibold tracking-tight">
            <span className="gradient-text">Model marketplace</span>
          </h1>
          <p className="reveal reveal-delay-2 mt-3 mx-auto max-w-2xl text-text-dim">
            Compare seller prices side-by-side, then buy credits with one signature. Pay direct to the seller's wallet in USDC.
          </p>
        </header>
        <div className="reveal reveal-delay-3">
          <MarketplaceTable />
        </div>
      </div>
    </div>
  );
}
