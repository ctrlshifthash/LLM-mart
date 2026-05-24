'use client';
import { PrivyProvider, usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { useEffect } from 'react';

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta';
const RPC = CLUSTER === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com';

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: true });

export function Providers({ children }: { children: React.ReactNode }) {
  if (!APP_ID) return <MissingAppId>{children}</MissingAppId>;
  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#22d3ee',
          logo: '/logo.svg',
          walletChainType: 'solana-only',
          walletList: ['phantom', 'solflare'],
        },
        embeddedWallets: {
          solana: { createOnLogin: 'users-without-wallets' },
        },
        solanaClusters: [{ name: CLUSTER, rpcUrl: RPC }],
        externalWallets: { solana: { connectors: solanaConnectors } },
      } as any}
    >
      <TokenSync />
      {children}
    </PrivyProvider>
  );
}

function TokenSync() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { identityToken } = useIdentityToken();
  useEffect(() => {
    if (!ready) return;
    (async () => {
      if (authenticated) {
        const t = await getAccessToken();
        if (t) document.cookie = `privy-token=${encodeURIComponent(t)}; path=/; max-age=3600; samesite=lax`;
        if (identityToken) document.cookie = `privy-id-token=${encodeURIComponent(identityToken)}; path=/; max-age=3600; samesite=lax`;
      } else {
        document.cookie = 'privy-token=; path=/; max-age=0';
        document.cookie = 'privy-id-token=; path=/; max-age=0';
      }
    })();
  }, [ready, authenticated, identityToken, getAccessToken]);
  return null;
}

function MissingAppId({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.warn('[privy] NEXT_PUBLIC_PRIVY_APP_ID not set — auth disabled');
  }, []);
  return <>{children}</>;
}
