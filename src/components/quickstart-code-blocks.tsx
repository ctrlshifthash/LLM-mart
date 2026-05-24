'use client';
import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TABS = ['Override Base URL', 'Terminal', 'OpenAI SDK', 'Anthropic SDK', 'Claude Code'] as const;
type Tab = (typeof TABS)[number];

export function QuickstartCodeBlocks() {
  const [tab, setTab] = useState<Tab>('Override Base URL');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const base = `${origin}/api/inference/v1`;

  const snippets: Record<Tab, { lang: string; code: string }> = useMemo(() => ({
    'Override Base URL': {
      lang: 'text',
      code: base,
    },
    'Terminal': {
      lang: 'bash',
      code:
`export SURPLUS_API_KEY="inf_your_key_here"

curl ${base}/chat/completions \\
  -H "Authorization: Bearer $SURPLUS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "anthropic/claude-3.5-sonnet",
    "stream": true,
    "messages": [{"role":"user","content":"hello"}]
  }'`,
    },
    'OpenAI SDK': {
      lang: 'python',
      code:
`from openai import OpenAI

client = OpenAI(
    api_key="inf_your_key_here",
    base_url="${base}",
)

resp = client.chat.completions.create(
    model="openai/gpt-4.1-mini",
    messages=[{"role": "user", "content": "hello"}],
    stream=True,
)
for chunk in resp:
    print(chunk.choices[0].delta.content or "", end="")`,
    },
    'Anthropic SDK': {
      lang: 'bash',
      code:
`# Point the Anthropic SDK at Surplus by overriding the base URL
export ANTHROPIC_BASE_URL="${base}"
export ANTHROPIC_API_KEY="inf_your_key_here"

# Anthropic SDK / Claude CLI now route through the marketplace.`,
    },
    'Claude Code': {
      lang: 'bash',
      code:
`# Run Claude Code through Surplus Intelligence
export ANTHROPIC_BASE_URL="${base}"
export ANTHROPIC_API_KEY="inf_your_key_here"

claude  # the rest of your normal workflow`,
    },
  }), [base]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-bg-card/60 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              t === tab ? 'bg-accent text-black' : 'text-text-dim hover:text-text',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <CodeBlock code={snippets[tab].code} lang={snippets[tab].lang} />
    </div>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group rounded-lg border border-border bg-bg-elevated/60 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-text-faint">
        <span className="font-mono">{lang}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            toast.success('Copied');
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1 text-text-faint hover:text-accent"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
        </button>
      </div>
      <pre className="p-4 text-xs leading-relaxed font-mono overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}
