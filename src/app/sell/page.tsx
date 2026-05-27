'use client';
import { Accordion } from '@/components/ui/accordion';
import { AccordionSection } from '@/components/accordion-section';
import { ClientOnly } from '@/components/client-only';
import { NeedsPrivy } from '@/components/needs-privy';
import { AuthGate } from '@/components/auth-gate';
import { SellerOffersPanel } from '@/components/seller-offers';
import { SellerEarnings } from '@/components/seller-earnings';

export default function SellPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-6 py-14">
        <header className="mb-10 text-center">
          <h1 className="reveal text-4xl sm:text-6xl font-semibold tracking-tight">
            <span className="gradient-text">Sell Capacity</span>
          </h1>
          <p className="reveal reveal-delay-1 mt-4 mx-auto max-w-2xl text-text-dim leading-relaxed">
            Got an OpenAI, Anthropic, or OpenRouter account with credit you don't use? List the models you want to
            resell, set your price per million tokens, paste your API key. When a buyer tops up, you get paid in USDC
            on-chain — instantly, no withdrawal step.
          </p>
        </header>

        <Accordion type="multiple" defaultValue={['s1']} className="flex flex-col gap-3 reveal reveal-delay-2">
          <AccordionSection
            value="s1"
            number={1}
            title="Create Offers"
            subtitle="Pick a model, set your USDC price per million tokens, paste an upstream API key."
          >
            <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><SellerOffersPanel /></AuthGate></ClientOnly></NeedsPrivy>
          </AccordionSection>

          <AccordionSection
            value="s2"
            number={2}
            title="Earnings"
            subtitle="You receive 99% of every top-up upfront, on-chain. Platform takes 1% in the same tx."
          >
            <NeedsPrivy><ClientOnly fallback={<Skel />}><AuthGate><SellerEarnings /></AuthGate></ClientOnly></NeedsPrivy>
          </AccordionSection>

          <AccordionSection
            value="s3"
            number={3}
            title="How Routing Works"
            subtitle="Buyers' API calls land on the cheapest healthy offer for the model they call."
          >
            <ul className="text-sm text-text-dim space-y-2 leading-relaxed">
              <li>· Your offers compete on price-per-million-tokens. Cheapest live offer with credits wins each request.</li>
              <li>· If your upstream key returns an error, your offer is marked unhealthy for 60s and traffic skips it.</li>
              <li>· You receive 99% of every top-up upfront, on-chain. Platform takes 1% in the same tx.</li>
              <li>· Each offer has a daily USDC cap; once reached, traffic skips to the next cheapest offer.</li>
            </ul>
          </AccordionSection>
        </Accordion>
      </div>
    </div>
  );
}

function Skel() {
  return <div className="h-24 rounded-md bg-bg-elevated/40 animate-pulse" />;
}
