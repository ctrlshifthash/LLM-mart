import Link from 'next/link';
import { ArrowRight, Wallet, KeyRound, Coins, Send, ShieldCheck, Tag, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora" aria-hidden />
      <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden />

      {/* ───── Hero ───── */}
      <section className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-bg-card/60 backdrop-blur px-3 py-1 text-[11px] text-text-dim reveal">
          <span className="dot pulse-dot" />
          GPT-4, Claude, Gemini, Llama — 350+ models, up to 90% off
        </div>

        <h1 className="reveal reveal-delay-1 mt-6 text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05]">
          <span className="text-text">Run AI models for</span>
          <br />
          <span className="gradient-text">70–90% less.</span>
        </h1>

        <p className="reveal reveal-delay-2 mt-6 mx-auto max-w-xl text-base sm:text-lg text-text-dim leading-relaxed">
          Buy AI inference from people with leftover OpenRouter, Venice AI, or Uncensored AI credits. Pay in USDC.
        </p>

        <div className="reveal reveal-delay-3 mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/markets"
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black btn-glow hover:bg-accent/90 transition-all"
          >
            See prices
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-bg-card/60 backdrop-blur px-6 py-3 text-sm font-medium hover:bg-bg-card-hover hover:border-accent/50 transition-all"
          >
            Have leftover credit? Sell it
          </Link>
        </div>
      </section>

      {/* ───── Buyer path ───── */}
      <section className="relative mx-auto max-w-5xl px-6 pb-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-accent reveal">
            <span className="h-px w-6 bg-accent/60" />For buyers<span className="h-px w-6 bg-accent/60" />
          </div>
          <h2 className="reveal reveal-delay-1 mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">From sign-in to first response in 60 seconds</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <Step
            n={1}
            icon={<Wallet className="h-4 w-4" />}
            title="Pick a model"
            text="Open the marketplace, find a model. Each row shows every seller and their price."
            cta={{ label: 'Open /markets', href: '/markets' }}
          />
          <Step
            n={2}
            icon={<Coins className="h-4 w-4" />}
            title="Buy credits"
            text="Click Buy on a seller. One Phantom signature pays them in USDC (99%) + treasury (1%) in one tx."
            cta={{ label: 'See sellers', href: '/markets' }}
          />
          <Step
            n={3}
            icon={<KeyRound className="h-4 w-4" />}
            title="Mint an API key"
            text="Go to /buy section 1, click New key, copy the inf_ secret (shown once)."
            cta={{ label: 'Mint a key', href: '/buy' }}
          />
          <Step
            n={4}
            icon={<Send className="h-4 w-4" />}
            title="Test it on the page"
            text="Section 4 “Try it in the browser” — paste the key, pick a model, hit Send. Streams back live."
            cta={{ label: 'Try it now', href: '/buy' }}
          />
        </div>
        <div className="mt-6 rounded-xl glass p-4 text-center text-xs text-text-faint reveal">
          Done? Same <code className="font-mono text-text">inf_</code> key works in the OpenAI SDK, Anthropic SDK, or Claude Code — just set <code className="font-mono text-text">base_url</code> to <code className="font-mono text-text">/api/inference/v1</code>. <Link href="/docs" className="text-accent hover:underline">Read the docs →</Link>
        </div>
      </section>

      {/* ───── Seller path ───── */}
      <section className="relative mx-auto max-w-5xl px-6 pb-24">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-accent-3 reveal">
            <span className="h-px w-6 bg-accent-3/60" />For sellers<span className="h-px w-6 bg-accent-3/60" />
          </div>
          <h2 className="reveal reveal-delay-1 mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">Turn leftover credit into USDC</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Step
            n={1}
            icon={<Tag className="h-4 w-4" />}
            title="List an offer"
            text="On /sell, pick OpenRouter / Venice / Uncensored, paste your API key, set your per-million-token price."
            cta={{ label: 'Open /sell', href: '/sell' }}
          />
          <Step
            n={2}
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Key gets tested"
            text="At save-time we ping your provider's /models endpoint with the key. Bad keys are rejected before any buyer ever sees them."
          />
          <Step
            n={3}
            icon={<TrendingUp className="h-4 w-4" />}
            title="Get paid on-chain"
            text="When a buyer tops up, USDC lands in your wallet immediately — no payout schedule, no withdraw step. You earn margin on each routed request."
          />
        </div>
      </section>

      {/* ───── Where to go panels ───── */}
      <section className="relative mx-auto max-w-5xl px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardLabel>If you use AI models</CardLabel>
            <h3 className="mt-2 text-2xl font-semibold">Same models. A fraction of the bill.</h3>
            <p className="mt-3 text-sm text-text-dim leading-relaxed">
              You hit our endpoint instead of OpenAI's. Same request, same response, same SDK — but routed through a seller who's already paying for the model. Typical savings: 70–90%.
            </p>
            <Link href="/buy" className="mt-5 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
              Start using it <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>

          <Card>
            <CardLabel>If you have credits sitting unused</CardLabel>
            <h3 className="mt-2 text-2xl font-semibold">Get paid for what you'd waste.</h3>
            <p className="mt-3 text-sm text-text-dim leading-relaxed">
              Got an OpenRouter / Venice / Uncensored account with quota you don't burn through? List a model, paste your key, set your price. Buyers' requests run on your account, you get paid in USDC straight to your wallet.
            </p>
            <Link href="/sell" className="mt-5 inline-flex items-center gap-1.5 text-sm text-accent-3 hover:underline">
              List your credits <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      </section>

      {/* ───── Concrete example ───── */}
      <section className="relative mx-auto max-w-3xl px-6 pb-24">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight reveal">Real example</h2>
        </div>
        <div className="glass rounded-2xl p-6 reveal reveal-delay-1">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/70 bg-bg-elevated/40 p-5">
              <div className="text-[10px] uppercase tracking-widest text-text-faint">Going direct to OpenAI</div>
              <div className="mt-2 font-mono text-2xl">
                <span className="text-text-faint">GPT-4o → </span><span className="text-text">$2.50/M in · $10/M out</span>
              </div>
              <div className="mt-4 text-xs text-text-faint">1M token chat → <span className="font-mono text-text">~$12.50</span></div>
            </div>
            <div className="rounded-xl border border-success/40 bg-success/5 p-5">
              <div className="text-[10px] uppercase tracking-widest text-success/80">Through a marketplace seller</div>
              <div className="mt-2 font-mono text-2xl">
                <span className="text-text-faint">GPT-4o → </span><span className="text-success">$0.28/M in · $1.13/M out</span>
              </div>
              <div className="mt-4 text-xs text-text-faint">1M token chat → <span className="font-mono text-success">~$1.41 · save 89%</span></div>
            </div>
          </div>
          <p className="mt-5 text-xs text-text-faint text-center">
            Same model, same output. The seller's already paying OpenAI; you're paying them.
          </p>
        </div>
      </section>

      {/* ───── Trust strip ───── */}
      <section className="relative mx-auto max-w-5xl px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-4">
          <TrustCard
            icon={<ShieldCheck className="h-5 w-5 text-accent" />}
            title="Non-custodial"
            text="Your USDC moves wallet-to-wallet on Solana. We never hold seller funds — only a 1% treasury skim per top-up."
          />
          <TrustCard
            icon={<CheckCircle2 className="h-5 w-5 text-success" />}
            title="Verified keys"
            text="Every seller's upstream key is tested against the provider before their offer can go live. No 401s in production."
          />
          <TrustCard
            icon={<KeyRound className="h-5 w-5 text-accent-2" />}
            title="Drop-in API"
            text="OpenAI-compatible. Works with OpenAI SDK, Anthropic SDK, Claude Code, curl — anything that lets you set base_url."
          />
        </div>
      </section>

      {/* ───── Stats strip ───── */}
      <section className="relative mx-auto max-w-5xl px-6 pb-28">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Models" value="350+" />
          <Stat label="Settled in" value="USDC" />
          <Stat label="Median savings" value="78%" />
          <Stat label="Platform fee" value="1%" />
        </div>
      </section>

      {/* ───── Bottom CTA ───── */}
      <section className="relative mx-auto max-w-3xl px-6 pb-32 text-center">
        <h3 className="text-3xl font-semibold tracking-tight">Stop overpaying for AI.</h3>
        <p className="mt-3 text-text-dim">No team plan, no deposit, no minimums. Sign in and check prices.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/markets"
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black btn-glow hover:bg-accent/90 transition-all"
          >
            See what you'd save
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-bg-card/60 backdrop-blur px-6 py-3 text-sm font-medium hover:bg-bg-card-hover hover:border-accent/50 transition-all"
          >
            Read the docs
          </Link>
        </div>
      </section>
    </div>
  );
}

function Step({
  n, icon, title, text, cta,
}: {
  n: number; icon: React.ReactNode; title: string; text: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="glass glass-hover rounded-2xl p-6 reveal flex flex-col">
      <div className="flex items-center gap-3">
        <span className="num-badge">{n}</span>
        <span className="text-text-dim">{icon}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-text-dim leading-relaxed flex-1">{text}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          {cta.label} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass glass-hover rounded-2xl p-6 reveal">{children}</div>;
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-accent">
      <span className="h-px w-5 bg-accent/60" />{children}
    </div>
  );
}

function TrustCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="glass glass-hover rounded-2xl p-5 reveal">
      <div className="flex items-center gap-2">{icon}<h4 className="font-semibold">{title}</h4></div>
      <p className="mt-3 text-sm text-text-dim leading-relaxed">{text}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl px-4 py-3 lift">
      <div className="text-[10px] uppercase tracking-widest text-text-faint">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold">{value}</div>
    </div>
  );
}
