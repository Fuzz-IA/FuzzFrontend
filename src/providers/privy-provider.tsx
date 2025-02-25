'use client';

import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function PrivyWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  return children;
}

export default function PrivyClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          showWalletLoginFirst: true,
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: {
          id: 8453,
          name: 'Base',
          network: 'base',
          nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: {
            default: {
              http: ['https://mainnet.base.org'],
            },
            public: {
              http: ['https://mainnet.base.org'],
            },
          },
          blockExplorers: {
            default: {
              name: 'BaseScan',
              url: 'https://basescan.org',
            },
          },
          testnet: false,
        },
      }}
    >
      <PrivyWrapper>{children}</PrivyWrapper>
    </PrivyProvider>
  );
} 