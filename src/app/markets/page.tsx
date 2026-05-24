import { MarketplaceTable } from '@/components/marketplace-table';

export default function MarketsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Model Marketplace</h1>
        <p className="mt-3 text-text-dim">Explore models and prices</p>
      </header>
      <MarketplaceTable />
    </div>
  );
}
