import React, { FC, ReactNode, useMemo, useEffect, useRef } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useNetwork } from './NetworkProvider';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Inner guard component that auto-disconnects the wallet whenever
 * the Solana cluster (network) changes, preventing cross-network transactions.
 * Must be rendered INSIDE WalletProvider so it can call useWallet().
 */
const WalletNetworkGuard: FC<{ cluster: WalletAdapterNetwork; children: ReactNode }> = ({ cluster, children }) => {
    const { disconnect, connected } = useWallet();
    const prevCluster = useRef<WalletAdapterNetwork | null>(null);

    useEffect(() => {
        // On first render, just record the current cluster
        if (prevCluster.current === null) {
            prevCluster.current = cluster;
            return;
        }
        // If cluster changed and wallet is connected, disconnect to avoid cross-network txs
        if (prevCluster.current !== cluster && connected) {
            console.info('[SolanaProvider] Network changed — disconnecting wallet to prevent cross-network transactions.');
            disconnect();
        }
        prevCluster.current = cluster;
    }, [cluster, connected, disconnect]);

    return <>{children}</>;
};

export const SolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { network: currentNetwork } = useNetwork();

    // Mapping 'devnet' | 'mainnet' to Solana Cluster
    const solanaCluster = useMemo(() => {
        if (currentNetwork === 'mainnet') return WalletAdapterNetwork.Mainnet;
        return WalletAdapterNetwork.Devnet;
    }, [currentNetwork]);

    // Use permissive public RPCs to avoid CORS/429 rate-limit issues
    const endpoint = useMemo(() => {
        if (solanaCluster === WalletAdapterNetwork.Mainnet) {
            return 'https://solana-rpc.publicnode.com';
        }
        return 'https://api.devnet.solana.com';
    }, [solanaCluster]);

    // Re-instantiate adapters when cluster changes so they target the correct network
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter({}),
            new SolflareWalletAdapter(),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [solanaCluster]
    );

    // If a ?wallet=<name> param is in the URL, store it so the adapter can autoConnect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const walletName = params.get('wallet');
        if (walletName) {
            localStorage.setItem('walletName', JSON.stringify(walletName));
            const url = new URL(window.location.href);
            url.searchParams.delete('wallet');
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            {/*
              * autoConnect=true: honours the walletName stored in localStorage
              * (set above from URL param) so users are seamlessly reconnected.
              */}
            <WalletProvider wallets={wallets} autoConnect={true}>
                <WalletModalProvider>
                    <WalletNetworkGuard cluster={solanaCluster}>
                        {children}
                    </WalletNetworkGuard>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
