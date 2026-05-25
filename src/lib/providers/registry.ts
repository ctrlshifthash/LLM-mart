export type ProviderSlug = 'openrouter' | 'venice' | 'uncensored';

export type Provider = {
  slug: ProviderSlug;
  name: string;
  baseUrl: string;
  tint: string;
  openaiCompatible: boolean;
};

// Three discount-API providers sellers actually resell from.
// OpenRouter already aggregates OpenAI / Anthropic / Llama / Gemini / etc.,
// so we don't list them as separate upstreams.
export const PROVIDERS: Provider[] = [
  { slug: 'venice',     name: 'Venice AI',     baseUrl: 'https://api.venice.ai/api/v1',   tint: 'text-success', openaiCompatible: true },
  { slug: 'uncensored', name: 'Uncensored AI', baseUrl: 'https://api.uncensored.chat/v1', tint: 'text-warn',    openaiCompatible: true },
  { slug: 'openrouter', name: 'OpenRouter',    baseUrl: 'https://openrouter.ai/api/v1',   tint: 'text-accent',  openaiCompatible: true },
];

const BY_SLUG = new Map<string, Provider>(PROVIDERS.map((p) => [p.slug, p]));

export function getProvider(slug: string | null | undefined): Provider | null {
  if (!slug) return null;
  return BY_SLUG.get(slug.toLowerCase()) || null;
}

export function getProviderName(slug: string | null | undefined): string {
  return getProvider(slug)?.name ?? (slug || 'Unknown');
}
