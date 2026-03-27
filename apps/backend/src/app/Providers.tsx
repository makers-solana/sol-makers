'use client';

import { ThirdwebProvider } from "thirdweb/react";
import { 
    ConnectionProvider, 
    WalletProvider 
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import React, { useMemo, useEffect } from 'react';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const walletName = params.get('wallet');
    if (walletName) {
      localStorage.setItem('walletName', JSON.stringify(walletName));
      // Remove the param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('wallet');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return (
    <ThirdwebProvider>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThirdwebProvider>
  );
}
