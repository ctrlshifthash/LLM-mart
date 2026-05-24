'use client';
import dynamic from 'next/dynamic';
import { Accordion } from '@/components/ui/accordion';
import { AccordionSection } from '@/components/accordion-section';

const ApiKeysPanel = dynamic(() => import('@/components/api-keys-panel').then((m) => m.ApiKeysPanel), { ssr: false });
const DepositPanel = dynamic(() => import('@/components/deposit-panel').then((m) => m.DepositPanel), { ssr: false });

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

        <AccordionSection value="s3" number={3} title="Router Settings (optional)" subtitle="Priority and fallback providers — phase 9.">
          <div className="text-sm text-text-dim">Coming online in phase 9.</div>
        </AccordionSection>

        <AccordionSection value="s4" number={4} title="Quick Start" subtitle="Curl, OpenAI SDK, Anthropic SDK, Claude Code — phase 12.">
          <div className="text-sm text-text-dim">Coming online in phase 12.</div>
        </AccordionSection>

        <AccordionSection value="s5" number={5} title="Your Savings and Purchases" subtitle="Stat tiles + purchase log — phase 10.">
          <div className="text-sm text-text-dim">Coming online in phase 10.</div>
        </AccordionSection>
      </Accordion>
    </div>
  );
}
