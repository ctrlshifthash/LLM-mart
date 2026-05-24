'use client';
import { ClientOnly } from '@/components/client-only';
import { NeedsPrivy } from '@/components/needs-privy';
import { AuthGate } from '@/components/auth-gate';
import { SellerOffersPanel } from '@/components/seller-offers';
import { SellerEarnings } from '@/components/seller-earnings';

export default function SellPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Sell Capacity</h1>
        <p className="mt-3 mx-auto max-w-2xl text-text-dim">
          List surplus inference from your provider accounts. Earn USDC on every routed request.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <Section n={1} title="Create offers" subtitle="Pick a model, set your USDC price per million tokens, paste an upstream API key.">
          <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><SellerOffersPanel /></AuthGate></ClientOnly></NeedsPrivy>
        </Section>

        <Section n={2} title="Earnings" subtitle="USDC credits accrue with every routed request. Withdraw any time.">
          <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><SellerEarnings /></AuthGate></ClientOnly></NeedsPrivy>
        </Section>

        <Section n={3} title="How routing works" subtitle="Buyers' requests land on the cheapest healthy offer for the model they call.">
          <ul className="text-sm text-text-dim space-y-2 leading-relaxed">
            <li>· Your offers compete on price-per-million-tokens. Cheapest live offer wins each request.</li>
            <li>· If your upstream key returns an error, your offer is marked unhealthy for 60s and traffic skips it.</li>
            <li>· The platform takes a 10% fee; the remaining 90% is credited to your balance per request.</li>
            <li>· Each offer has a daily USDC cap; once reached, traffic skips to the next cheapest offer.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({ n, title, subtitle, children }: { n: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-bg-card/60 backdrop-blur-sm card-glow overflow-hidden">
      <header className="flex items-start gap-4 p-5 border-b border-border">
        <span className="num-badge mt-0.5">{n}</span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-text-dim leading-relaxed">{subtitle}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Skel() {
  return <div className="h-24 rounded-md bg-bg-elevated/40 animate-pulse" />;
}
