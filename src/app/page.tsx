import Link from 'next/link';
import { ArrowRight, Zap, Coins, Network } from 'lucide-react';

export default function Landing() {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-[600px] bg-grid -z-10" />

      <section className="mx-auto max-w-7xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs text-accent fade-up">
          <Zap className="h-3 w-3" /> live on solana devnet · openai-compatible
        </div>
        <h1 className="mt-6 text-5xl sm:text-7xl font-semibold tracking-tight fade-up">
          Inference at <span className="text-accent">surplus</span> price.
        </h1>
        <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-text-dim fade-up">
          The marketplace for surplus AI capacity. Buyers route requests through the cheapest live seller —
          settled in USDC on Solana, 70-90% below sticker.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 fade-up">
          <Link href="/buy" className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-black btn-glow hover:bg-accent/90">
            Start buying <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/sell" className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-bg-card px-5 py-2.5 text-sm font-medium hover:bg-bg-card-hover">
            Sell capacity
          </Link>
        </div>

        <div className="mt-16 grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto fade-up">
          <Tile icon={<Coins className="h-5 w-5" />} title="Pay only for tokens" body="No subscriptions. Fund a wallet, mint a key, call the endpoint." />
          <Tile icon={<Network className="h-5 w-5" />} title="Cheapest seller wins" body="Every request is routed to the lowest live offer for the model." />
          <Tile icon={<Zap className="h-5 w-5" />} title="OpenAI-compatible" body="Drop-in for OpenAI SDK, Anthropic SDK, Claude Code, any client." />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-2xl border border-border bg-bg-card/40 backdrop-blur-sm card-glow p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold">Model Marketplace</h2>
          <p className="mt-2 text-text-dim">Explore live models and prices, ranked by best available offer.</p>
          <Link href="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-black btn-glow hover:bg-accent/90">
            Browse marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card/40 p-5 text-left card-glow">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">{icon}</div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-text-dim leading-relaxed">{body}</p>
    </div>
  );
}
