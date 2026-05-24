import { MarketplaceTable } from '@/components/marketplace-table';

export default function MarketplacePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Marketplace</h1>
        <p className="mt-2 text-text-dim">
          Live models and prices ranked by best offer. Prices are <span className="text-accent">USDC per million tokens</span>.
        </p>
      </header>
      <MarketplaceTable />
    </div>
  );
}
