export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">Docs</h1>
        <p className="mt-2 text-text-dim">Surplus Intelligence — OpenAI-compatible inference, settled in USDC on Solana.</p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed">
        <Block title="Endpoint">
          <code className="font-mono text-accent">POST /api/inference/v1/chat/completions</code>
          <p className="mt-2 text-text-dim">
            Drop-in replacement for the OpenAI Chat Completions endpoint. Send your <code>inf_</code> key as a bearer
            token. Streaming and non-streaming both supported.
          </p>
        </Block>

        <Block title="Routing">
          <p className="text-text-dim">For each request the router tries, in order:</p>
          <ol className="mt-2 list-decimal list-inside space-y-1 text-text-dim">
            <li>Your <strong>priority key</strong> (if you set one in Router Settings)</li>
            <li>The <strong>cheapest healthy marketplace offer</strong> for the model</li>
            <li>Your <strong>fallback key</strong> (if you set one)</li>
          </ol>
        </Block>

        <Block title="Billing">
          <p className="text-text-dim">
            Buyer is charged the seller&apos;s quoted price per million tokens. Platform takes a 10% fee. Seller is
            credited 90%. Insufficient balance returns <code>402</code> with a structured error.
          </p>
        </Block>

        <Block title="Settlement">
          <p className="text-text-dim">
            All balances are tracked as USDC. Deposits are one signed SPL transfer to the platform treasury on
            Solana. Withdrawals are signed by the platform treasury and broadcast on the configured cluster
            (devnet by default).
          </p>
        </Block>

        <Block title="Compatibility">
          <p className="text-text-dim">Works out of the box with:</p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-text-dim font-mono text-xs">
            <li>curl</li>
            <li>OpenAI Python / TypeScript SDK (override <code>base_url</code>)</li>
            <li>Anthropic SDK (override <code>ANTHROPIC_BASE_URL</code>)</li>
            <li>Claude Code (same env override)</li>
          </ul>
        </Block>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-bg-card/60 p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
