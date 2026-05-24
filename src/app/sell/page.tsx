'use client';
import dynamic from 'next/dynamic';
import { Accordion } from '@/components/ui/accordion';
import { AccordionSection } from '@/components/accordion-section';

const SellerOffersPanel = dynamic(() => import('@/components/seller-offers').then((m) => m.SellerOffersPanel), { ssr: false });
const SellerEarnings = dynamic(() => import('@/components/seller-earnings').then((m) => m.SellerEarnings), { ssr: false });

export default function SellPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Sell capacity</h1>
        <p className="mt-1 text-text-dim">List surplus inference from your provider accounts and earn on every request.</p>
      </header>

      <Accordion type="multiple" defaultValue={['s1', 's2', 's3']} className="flex flex-col gap-4">
        <AccordionSection
          value="s1"
          number={1}
          title="Create offers"
          subtitle="Pick a model, set your USDC price per million tokens, paste an upstream API key."
        >
          <SellerOffersPanel />
        </AccordionSection>

        <AccordionSection
          value="s2"
          number={2}
          title="Earnings"
          subtitle="USDC credits accrue with every routed request. Withdraw any time."
        >
          <SellerEarnings />
        </AccordionSection>

        <AccordionSection
          value="s3"
          number={3}
          title="How routing works"
          subtitle="Buyers' requests land on the cheapest healthy offer for the model they call."
        >
          <ul className="text-sm text-text-dim space-y-2 leading-relaxed">
            <li>· Your offers compete on price-per-million-tokens. Cheapest live offer wins each request.</li>
            <li>· If your upstream key returns an error, your offer is marked unhealthy for 60s and traffic skips it.</li>
            <li>· The platform takes a 10% fee; the remaining 90% is credited to your balance per request.</li>
            <li>· Each offer has a daily USDC cap; once reached, traffic skips to the next cheapest offer.</li>
          </ul>
        </AccordionSection>
      </Accordion>
    </div>
  );
}
