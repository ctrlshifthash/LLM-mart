'use client';
import { usePrivy } from '@privy-io/react-auth';
import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';
import { useCallback } from 'react';

export function useAuthedFetch() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  return useCallback(
    async (input: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      if (ready && authenticated) {
        const t = await getAccessToken();
        if (t) headers.set('authorization', `Bearer ${t}`);
      }
      return fetch(input, { ...init, headers, credentials: 'include' });
    },
    [ready, authenticated, getAccessToken],
  );
}

export function useAuthedSWR<T>(path: string | null, config?: SWRConfiguration<T>): SWRResponse<T> {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const key = ready && authenticated && path ? path : null;
  return useSWR<T>(
    key,
    async (url: string) => {
      const t = await getAccessToken();
      const res = await fetch(url, {
        headers: t ? { authorization: `Bearer ${t}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `request failed ${res.status}`);
      }
      return res.json();
    },
    config,
  );
}
