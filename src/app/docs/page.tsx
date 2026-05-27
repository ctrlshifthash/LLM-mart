import { BookOpen, Plug, Coins, Route, ShieldCheck, Code } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora opacity-50" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-6 py-14">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-bg-card/60 backdrop-blur px-3 py-1 text-[11px] text-text-dim reveal">
            <BookOpen className="h-3 w-3 text-accent" /> LLM Mart
          </div>
          <h1 className="reveal reveal-delay-1 mt-5 text-4xl sm:text-6xl font-semibold tracking-tight">
            <span className="gradient-text">Docs</span>
          </h1>
          <p className="reveal reveal-delay-2 mt-3 mx-auto max-w-2xl text-text-dim">
            OpenAI-compatible inference, paid in USDC on Solana. One signature, then it's just API calls.
          </p>
        </header>

        <div className="space-y-5 text-sm leading-relaxed">
          <Block n={1} icon={<Plug className="h-4 w-4" />} title="Endpoint">
            <code className="font-mono text-accent">POST /api/inference/v1/chat/completions</code>
            <p className="mt-2 text-text-dim">
              Drop-in replacement for the OpenAI Chat Completions endpoint. Send your <code className="font-mono text-accent">inf_</code> key as a bearer token. Streaming and non-streaming both supported.
            </p>
          </Block>

          <Block n={2} icon={<Route className="h-4 w-4" />} title="Routing">
            <p className="text-text-dim">For each request the router tries, in order:</p>
            <ol className="mt-3 space-y-2 text-text-dim">
              <li><span className="font-mono text-accent">1.</span> Your <strong>priority key</strong> (if set in Router Settings).</li>
              <li><span className="font-mono text-accent">2.</span> The <strong>cheapest healthy marketplace offer</strong> where you have credits with the seller.</li>
              <li><span className="font-mono text-accent">3.</span> Your <strong>fallback key</strong> (if set).</li>
            </ol>
          </Block>

          <Block n={3} icon={<Coins className="h-4 w-4" />} title="Billing">
            <p className="text-text-dim">
              Buyer is charged the seller's quoted price per million tokens. Credits are pre-purchased from /markets in USDC. Platform takes a 1% fee at top-up time; the rest goes straight to the seller's wallet.
            </p>
            <p className="mt-2 text-text-dim">
              When credits with a seller run out, the API returns <code className="font-mono text-warn">402 insufficient_credits</code>.
            </p>
          </Block>

          <Block n={4} icon={<ShieldCheck className="h-4 w-4" />} title="Settlement">
            <p className="text-text-dim">
              Top-ups are a single Solana transaction with two SPL transfers — seller wallet and treasury — in one buyer-signed tx. USDC never sits in the platform's custody for the seller portion.
            </p>
          </Block>

          <Block n={5} icon={<Code className="h-4 w-4" />} title="Compatibility">
            <p className="text-text-dim">Works out of the box with:</p>
            <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-text-dim font-mono text-xs">
              <li className="rounded-md border border-border/70 bg-bg-elevated/40 px-3 py-2">curl / fetch</li>
              <li className="rounded-md border border-border/70 bg-bg-elevated/40 px-3 py-2">OpenAI Python / TS SDK (<code>base_url</code>)</li>
              <li className="rounded-md border border-border/70 bg-bg-elevated/40 px-3 py-2">Anthropic SDK (<code>ANTHROPIC_BASE_URL</code>)</li>
              <li className="rounded-md border border-border/70 bg-bg-elevated/40 px-3 py-2">Claude Code (same env override)</li>
            </ul>
          </Block>
        </div>
      </div>
    </div>
  );
}

function Block({ n, icon, title, children }: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className={`reveal reveal-delay-${Math.min(n, 5)} rounded-2xl glass glass-hover p-6`}>
      <header className="flex items-center gap-3">
        <span className="num-badge">{n}</span>
        <span className="text-text-dim">{icon}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </header>
      <div className="mt-4 text-sm">{children}</div>
    </section>
  );
}
