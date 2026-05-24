'use client';
import dynamic from 'next/dynamic';
import { SetupBanner } from '@/components/setup-banner';

const ApiKeysPanel = dynamic(() => import('@/components/api-keys-panel').then((m) => m.ApiKeysPanel), { ssr: false });
const DepositPanel = dynamic(() => import('@/components/deposit-panel').then((m) => m.DepositPanel), { ssr: false });
const RouterConfigPanel = dynamic(() => import('@/components/router-config-panel').then((m) => m.RouterConfigPanel), { ssr: false });
const QuickstartCodeBlocks = dynamic(() => import('@/components/quickstart-code-blocks').then((m) => m.QuickstartCodeBlocks), { ssr: false });
const SavingsPanel = dynamic(() => import('@/components/savings-panel').then((m) => m.SavingsPanel), { ssr: false });

export default function BuyPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Buy Inference</h1>
        <p className="mt-3 mx-auto max-w-2xl text-text-dim">
          Get an API key, use it in any harness. Messages route to the marketplace where sellers are competing to give you the best prices.
        </p>
      </header>

      <SetupBanner />

      <div className="flex flex-col gap-6">
        <Section
          n={1}
          title="Create and Manage API Keys"
          subtitle="Mint inf_ keys. Use them as bearer tokens against the OpenAI-compatible endpoint."
        >
          <ApiKeysPanel />
        </Section>

        <Section
          n={2}
          title="Fund Your Account and Set Your Budget"
          subtitle="USDC on Solana. Balance is debited per request at the seller's quoted price."
        >
          <DepositPanel />
        </Section>

        <Section
          n={3}
          title="Router Settings (optional)"
          subtitle="Bring your own keys for priority + fallback. The marketplace handles everything in between."
        >
          <RouterConfigPanel />
        </Section>

        <Section
          n={4}
          title="Quick Start"
          subtitle="Drop your key into curl, the OpenAI SDK, the Anthropic SDK, or Claude Code."
        >
          <QuickstartCodeBlocks />
        </Section>

        <Section
          n={5}
          title="Your Savings and Purchases"
          subtitle="Every request, what you paid, and what you would've paid going direct."
        >
          <SavingsPanel />
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
