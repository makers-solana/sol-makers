import React, { FC, ReactNode, useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useNetwork } from './NetworkProvider';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

export const SolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { network: currentNetwork } = useNetwork();

    // Mapping 'devnet' | 'mainnet' to Solana Cluster
    const solanaCluster = useMemo(() => {
        if (currentNetwork === 'mainnet') return WalletAdapterNetwork.Mainnet;
        return WalletAdapterNetwork.Devnet;
    }, [currentNetwork]);

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(solanaCluster), [solanaCluster]);

    const wallets = useMemo(
        () => [
            /**
             * Wallets that implement either of these standards will be available automatically.
             *
             *   - Solana Mobile Stack Mobile Wallet Adapter Protocol
             *   - Wallet Standard
             *
             * If you wish to support a wallet that supports neither of those standards,
             * instantiate its legacy adapter here. Common legacy adapters can be found
             * in the library "@solana/wallet-adapter-wallets".
             */
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [solanaCluster]
    );

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const walletName = params.get('wallet');
        if (walletName) {
            localStorage.setItem('walletName', JSON.stringify(walletName));
            // Remove the param from URL to keep it clean
            const url = new URL(window.location.href);
            url.searchParams.delete('wallet');
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
