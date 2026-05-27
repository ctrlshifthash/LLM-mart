'use client';
import Link from 'next/link';
import { Accordion } from '@/components/ui/accordion';
import { AccordionSection } from '@/components/accordion-section';
import { ClientOnly } from '@/components/client-only';
import { NeedsPrivy } from '@/components/needs-privy';
import { AuthGate } from '@/components/auth-gate';
import { SetupBanner } from '@/components/setup-banner';
import { ApiKeysPanel } from '@/components/api-keys-panel';
import { WalletStatusPanel } from '@/components/wallet-status-panel';
import { CreditsPanel } from '@/components/credits-panel';
import { RouterConfigPanel } from '@/components/router-config-panel';
import { QuickstartCodeBlocks } from '@/components/quickstart-code-blocks';
import { SavingsPanel } from '@/components/savings-panel';
import { Playground } from '@/components/playground';
import { ArrowRight } from 'lucide-react';

export default function BuyPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-6 py-14">
        <header className="mb-10 text-center">
          <h1 className="reveal text-4xl sm:text-6xl font-semibold tracking-tight">
            <span className="gradient-text">Buy Inference</span>
          </h1>
          <p className="reveal reveal-delay-1 mt-4 mx-auto max-w-2xl text-text-dim leading-relaxed">
            Get an API key, use it in any harness. Messages route to the marketplace where sellers are competing to give you the best prices.
          </p>
          <div className="reveal reveal-delay-2 mt-6">
            <Link href="/markets" className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black btn-glow hover:bg-accent/90 transition-all">
              See prices first <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </header>

        <SetupBanner />

        <Accordion type="multiple" defaultValue={['k1']} className="flex flex-col gap-3 reveal reveal-delay-3">
          <AccordionSection
            value="k1"
            number={1}
            title="Create and Manage API Keys"
            subtitle="Mint inf_ keys. Use them as bearer tokens against the OpenAI-compatible endpoint."
          >
            <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><ApiKeysPanel /></AuthGate></ClientOnly></NeedsPrivy>
          </AccordionSection>

          <AccordionSection
            value="k2"
            number={2}
            title="Buy Credits with Sellers"
            subtitle="One Phantom signature pays a seller directly. Their USDC credit balance is what your API key spends."
          >
            <div className="space-y-5">
              <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><WalletStatusPanel /></AuthGate></ClientOnly></NeedsPrivy>
              <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><CreditsPanel /></AuthGate></ClientOnly></NeedsPrivy>
            </div>
          </AccordionSection>

          <AccordionSection
            value="k3"
            number={3}
            title="Router Settings (optional)"
            subtitle="Bring your own keys for priority + fallback. The marketplace handles everything in between."
          >
            <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><RouterConfigPanel /></AuthGate></ClientOnly></NeedsPrivy>
          </AccordionSection>

          <AccordionSection
            value="k4"
            number={4}
            title="Try it in the browser"
            subtitle="Paste your inf_ key, type a prompt, hit Send. Streams back here. No popups per request."
          >
            <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><Playground /></AuthGate></ClientOnly></NeedsPrivy>
          </AccordionSection>

          <AccordionSection
            value="k5"
            number={5}
            title="Quick Start"
            subtitle="Drop your key into curl, the OpenAI SDK, the Anthropic SDK, or Claude Code."
          >
            <ClientOnly fallback={<Skel />}><QuickstartCodeBlocks /></ClientOnly>
          </AccordionSection>

          <AccordionSection
            value="k6"
            number={6}
            title="Your Savings and Purchases"
            subtitle="Every request, what you paid, and what you would've paid going direct."
          >
            <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><SavingsPanel /></AuthGate></ClientOnly></NeedsPrivy>
          </AccordionSection>
        </Accordion>
      </div>
    </div>
  );
}

function Skel() {
  return <div className="h-24 rounded-md bg-bg-elevated/40 animate-pulse" />;
}
