'use client';
import dynamic from 'next/dynamic';
import { Accordion } from '@/components/ui/accordion';
import { AccordionSection } from '@/components/accordion-section';

const ApiKeysPanel = dynamic(() => import('@/components/api-keys-panel').then((m) => m.ApiKeysPanel), { ssr: false });
const DepositPanel = dynamic(() => import('@/components/deposit-panel').then((m) => m.DepositPanel), { ssr: false });
const RouterConfigPanel = dynamic(() => import('@/components/router-config-panel').then((m) => m.RouterConfigPanel), { ssr: false });
const QuickstartCodeBlocks = dynamic(() => import('@/components/quickstart-code-blocks').then((m) => m.QuickstartCodeBlocks), { ssr: false });
const SavingsPanel = dynamic(() => import('@/components/savings-panel').then((m) => m.SavingsPanel), { ssr: false });

export default function BuyPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Buy inference</h1>
        <p className="mt-1 text-text-dim">Fund a USDC balance, mint a key, and start saving on every request.</p>
      </header>

      <Accordion type="multiple" defaultValue={['s1', 's2', 's3', 's4', 's5']} className="flex flex-col gap-4">
        <AccordionSection
          value="s1"
          number={1}
          title="Create and Manage API Keys"
          subtitle="Mint inf_ keys. Use them as bearer tokens against the OpenAI-compatible endpoint."
        >
          <ApiKeysPanel />
        </AccordionSection>

        <AccordionSection
          value="s2"
          number={2}
          title="Fund Your Account and Set Your Budget"
          subtitle="USDC on Solana. Balance is debited per request at the seller's quoted price."
        >
          <DepositPanel />
        </AccordionSection>

        <AccordionSection
          value="s3"
          number={3}
          title="Router Settings (optional)"
          subtitle="Bring your own keys for priority + fallback. The marketplace handles everything in between."
        >
          <RouterConfigPanel />
        </AccordionSection>

        <AccordionSection
          value="s4"
          number={4}
          title="Quick Start"
          subtitle="Drop your key into curl, the OpenAI SDK, the Anthropic SDK, or Claude Code."
        >
          <QuickstartCodeBlocks />
        </AccordionSection>

        <AccordionSection
          value="s5"
          number={5}
          title="Your Savings and Purchases"
          subtitle="Every request, what you paid, and what you would&apos;ve paid going direct."
        >
          <SavingsPanel />
        </AccordionSection>
      </Accordion>
    </div>
  );
}
