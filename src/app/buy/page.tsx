'use client';
import { ClientOnly } from '@/components/client-only';
import { NeedsPrivy } from '@/components/needs-privy';
import { AuthGate } from '@/components/auth-gate';
import { SetupBanner } from '@/components/setup-banner';
import { ApiKeysPanel } from '@/components/api-keys-panel';
import { DepositPanel } from '@/components/deposit-panel';
import { RouterConfigPanel } from '@/components/router-config-panel';
import { QuickstartCodeBlocks } from '@/components/quickstart-code-blocks';
import { SavingsPanel } from '@/components/savings-panel';

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
        <Section n={1} title="Create and Manage API Keys" subtitle="Mint inf_ keys. Use them as bearer tokens against the OpenAI-compatible endpoint.">
          <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><ApiKeysPanel /></AuthGate></ClientOnly></NeedsPrivy>
        </Section>

        <Section n={2} title="Fund Your Account and Set Your Budget" subtitle="USDC on Solana. Balance is debited per request at the seller's quoted price.">
          <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><DepositPanel /></AuthGate></ClientOnly></NeedsPrivy>
        </Section>

        <Section n={3} title="Router Settings (optional)" subtitle="Bring your own keys for priority + fallback. The marketplace handles everything in between.">
          <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><RouterConfigPanel /></AuthGate></ClientOnly></NeedsPrivy>
        </Section>

        <Section n={4} title="Quick Start" subtitle="Drop your key into curl, the OpenAI SDK, the Anthropic SDK, or Claude Code.">
          <ClientOnly fallback={<Skel />}><QuickstartCodeBlocks /></ClientOnly>
        </Section>

        <Section n={5} title="Your Savings and Purchases" subtitle="Every request, what you paid, and what you would've paid going direct.">
          <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><SavingsPanel /></AuthGate></ClientOnly></NeedsPrivy>
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
