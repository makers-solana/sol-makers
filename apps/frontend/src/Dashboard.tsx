import React, { useState, useEffect } from 'react';
import { ConnectButton, useReadContract } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { defineChain, getContract } from "thirdweb";
import { buyFromListing, getAllValidListings } from "thirdweb/extensions/marketplace";
import { totalSupply } from "thirdweb/extensions/erc1155";
import { client } from "./lib/thirdweb";
import { useNetwork, SolanaNetwork } from './providers/NetworkProvider';
import { Wallet, MapPin, TrendingUp, ShieldCheck, Activity, Bed, Bath, Layout, Calculator, Clock, ChevronRight, CheckCircle2, CloudLightning, Sun, Moon, Globe, Menu, X } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

// Manually define Solana chains since they are not currently exported from thirdweb/chains in v5
const solana = defineChain({
  id: 1399811149,
  name: "Solana",
  nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
  blockExplorers: [{ name: "Solana Explorer", url: "https://explorer.solana.com" }],
});

const solanaDevnet = defineChain({
  id: 1399811150, // Custom ID or internal Solana devnet ID
  name: "Solana Devnet",
  nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
  blockExplorers: [{ name: "Solana Explorer", url: "https://explorer.solana.com/?cluster=devnet" }],
});

// Treasury Wallet Address replaced dynamically inside component

export default function Dashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { network, setNetwork } = useNetwork();
  const [villas, setVillas] = useState<any[]>([]);
  const [selectedVilla, setSelectedVilla] = useState<any>(null);
  const [investAmount, setInvestAmount] = useState<number>(1);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [claimConditionError, setClaimConditionError] = useState<string | null>(null);
  const [solPriceUsd, setSolPriceUsd] = useState<number>(150);

  const [referralAddress, setReferralAddress] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Solana Wallet Adapter hooks
  const { publicKey, wallet, sendTransaction, connected: solanaConnected } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark' : '';
  }, [theme]);

  useEffect(() => {
    fetchVillas();
    fetchSolPrice();
    extractReferral();
    const interval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(interval);
  }, [network]);

  const extractReferral = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      // Accept either full solana address (>30 chars) or 6 char short code
      if (ref && (ref.length > 30 || ref.length === 6)) {
        setReferralAddress(ref.toUpperCase()); // ensure codes are uppercase
        console.log("Referral address/code detected from URL:", ref);
      }
    } catch (e) {
      console.warn("Failed to extract referral from URL", e);
    }
  };

  const copyReferralLink = async () => {
    if (!publicKey) {
      alert("Please connect your Solana wallet first to generate your referral link!");
      return;
    }
    try {
      // Fetch or generate short code from backend
      const res = await fetch(`https://api.thehistorymaker.io/api/users/referral-code?address=${publicKey.toBase58()}`);
      if (!res.ok) throw new Error("Failed to get short code");
      const data = await res.json();
      
      const shortCode = data.referralCode || publicKey.toBase58();
      const link = `${window.location.origin}${window.location.pathname}?ref=${shortCode}`;
      await navigator.clipboard.writeText(link);
      alert("Referral link copied to clipboard: " + link);
    } catch (err) {
      console.error("Error copying referral link", err);
      // Fallback to full address
      const link = `${window.location.origin}${window.location.pathname}?ref=${publicKey.toBase58()}`;
      navigator.clipboard.writeText(link);
      alert("Referral link copied to clipboard (fallback): " + link);
    }
  };

  const fetchSolPrice = async () => {
    try {
      const response = await fetch('https://api.freecryptoapi.com/v1/getData?symbol=SOL', {
        headers: {
          'Authorization': 'Bearer qfb2dddbggnatwgo72bd'
        }
      });
      const json = await response.json();
      if (json.status === 'success' && json.symbols && json.symbols.length > 0) {
        const usdPrice = parseFloat(json.symbols[0].last);
        setSolPriceUsd(usdPrice);

      } else {
        throw new Error("Invalid price data");
      }
    } catch (e) {
      console.error("Failed to fetch SOL price, using fallback", e);
      if (solPriceUsd === 0) {
        setSolPriceUsd(150);

      }
    }
  };

  useEffect(() => {
    setClaimConditionError(null);
  }, [selectedVilla]);


  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchTokenSupply = async (mintAddress: string) => {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      const supplyInfo = await connection.getTokenSupply(mintPubkey);
      const totalSupply = supplyInfo.value.uiAmount || 0;

      try {
        const NETWORK_TREASURIES: Record<string, string> = {
          devnet: '8bw4qgyQnChaa91hxUViB8gMLjmC39UvFsPMydwRmUN8',
          mainnet: '5xKeGY3yZnMV3cz8MLqc9sjrbjH12yLbynB59aMpSvKz'
        };
        const treasuryAddress = NETWORK_TREASURIES[network] || NETWORK_TREASURIES.mainnet;
        const treasuryPubkey = new PublicKey(treasuryAddress);
        const tokenAccounts = await connection.getTokenAccountsByOwner(treasuryPubkey, { mint: mintPubkey });

        // If treasury has NO token account for this mint, it means no transfers have
        // occurred yet — treasury implicitly holds the full supply, so nothing is sold.
        if (tokenAccounts.value.length === 0) {
          return 0;
        }

        const balanceRecord = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
        const treasuryBalance = balanceRecord.value.uiAmount || 0;

        // sold = tokens minted − tokens still held by treasury
        return Math.max(0, totalSupply - treasuryBalance);
      } catch (balErr) {
        console.warn(`Could not fetch treasury balance for ${mintAddress}, defaulting to 0 sold:`, balErr);
        return 0;
      }
    } catch (e) {
      console.error(`Failed to fetch supply for ${mintAddress}:`, e);
      return 0;
    }
  };

  const fetchVillas = async () => {
    try {
      setIsLoading(true);

      const NFT_ADDRESSES: Record<SolanaNetwork, Record<string, string>> = {
        devnet: {
          v1: 'BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS',
          v2: 'd4Qqt3UzxcQBhqpRBZcQzknokCiGA82RRMzzwXBPYUg',
          v3: 'GABXPkqndQ7Fb7C2CST4pff1VkQXjcCtuvCdPpSRuQHy',
          v4: '5uNBRRYNEux1GovaiRrgaGJAHRUBp8hXQqNMdkFgFVf8',
        },
        mainnet: {
          v1: 'AUsosPL4ymUkqzisoUAMAqKj2VMGhduBhsS3ZnS7VXEy',
          v2: 'HXnYCPQWz1eHV8ipEKNYZSqkW84fA9EYkD9HrWDfbwQJ',
          v3: 'BNGXwuS1Wg6SG9Dpai8pgCXUXbYJAvyFiHEg8y4WKhMT',
          v4: '43riPPJd8QwqRjbhJZKewMjbc4iKhnTGJR9Magk1BqKG',
        }
      };

      const currentAddresses = NFT_ADDRESSES[network];

      const getSafeSupply = async (address: string) => {
        if (!address) return 0;
        try {
          return await fetchTokenSupply(address);
        } catch (e) {
          console.warn(`Failed to fetch supply for ${address} on ${network}`);
          return 0;
        }
      };

      const backendVillas = [];

      if (currentAddresses.v1) {
        const v1Sold = await getSafeSupply(currentAddresses.v1);
        backendVillas.push({
          id: 'v1',
          name: 'Villa Dreamland 1',
          location: 'Uluwatu, Bali',
          nftAddress: currentAddresses.v1,
          pricePerShareUsd: 100,
          apy: '0.0044',
          totalTokens: 40000,
          tokensSold: v1Sold,
          bedrooms: 2,
          bathrooms: 2,
          sqm: 131,
          occupancyStatus: 'Active',
          images: ['/assets/Villa 1.gif.mp4'],
          description: 'Premium fractionalized modern cliffside villa in Uluwatu, Bali. 40,000 shares available.',
          chain: 'solana'
        });
      }

      if (currentAddresses.v2) {
        await delay(1200);
        const v2Sold = await getSafeSupply(currentAddresses.v2);
        backendVillas.push({
          id: 'v2',
          name: 'Villa Dreamland 2',
          location: 'Uluwatu, Bali',
          nftAddress: currentAddresses.v2,
          pricePerShareUsd: 100,
          apy: '0.0044',
          totalTokens: 40000,
          tokensSold: v2Sold,
          bedrooms: 2,
          bathrooms: 2,
          sqm: 131,
          occupancyStatus: 'Active',
          images: ['/assets/Villa 2.gif.mp4'],
          description: 'Luxury tropical villa Uluwatu, surrounded by palm trees. 40,000 shares available.',
          chain: 'solana'
        });
      }

      if (currentAddresses.v3) {
        await delay(1200);
        const v3Sold = await getSafeSupply(currentAddresses.v3);
        backendVillas.push({
          id: 'v3',
          name: 'Villa Dreamland 3',
          location: 'Uluwatu, Bali',
          nftAddress: currentAddresses.v3,
          pricePerShareUsd: 100,
          apy: '0.0044',
          totalTokens: 40000,
          tokensSold: v3Sold,
          bedrooms: 2,
          bathrooms: 2,
          sqm: 131,
          occupancyStatus: 'Active',
          images: ['/assets/Villa 3.gif.mp4'],
          description: 'Exclusive luxury Uluwatu, perfect for sunset views. 40,000 shares available.',
          chain: 'solana'
        });
      }

      if (currentAddresses.v4) {
        await delay(1200);
        const v4Sold = await getSafeSupply(currentAddresses.v4);
        backendVillas.push({
          id: 'v4',
          name: 'Villa Dreamland 4',
          location: 'Uluwatu, Bali',
          nftAddress: currentAddresses.v4,
          pricePerShareUsd: 100,
          apy: '0.0044',
          totalTokens: 40000,
          tokensSold: v4Sold,
          bedrooms: 2,
          bathrooms: 2,
          sqm: 131,
          occupancyStatus: 'Active',
          images: ['/assets/Villa 4.gif.mp4'],
          description: 'Minimalist eco-friendly villa with stunning rice terrace views in Canggu. 40,000 shares available.',
          chain: 'solana'
        });
      }

      setVillas(backendVillas);
      setIsLoading(false);
    } catch (err) {
      console.error('Sync villas error:', err);
      setVillas([]);
      setIsLoading(false);
    }
  };

  const calculateReturn = (villa: any) => {
    const yieldRate = parseFloat(villa.apy) / 100;   // villa objects use .apy, not .ery
    const pricePerShareSol = 0.02;
    return `${(investAmount * pricePerShareSol * yieldRate).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
  };

  const handleSolanaAcquisition = async () => {
    if (!publicKey) {
      alert("Please connect your Solana wallet first!");
      return;
    }

    // Must have selected a villa to buy
    if (!selectedVilla || !selectedVilla.nftAddress) {
      alert("Please select a valid villa package to invest in.");
      return;
    }

    try {
      console.log("Requesting Smart Transaction Builder from Backend...");
      
      const pricePerShareSol = 0.02;
      const totalLamports = Math.floor(investAmount * pricePerShareSol * 1e9);
      
      // Validate referral: must be valid length (6 chars OR >30 chars) AND not self-referral
      const isReferralValid = referralAddress &&
        (referralAddress.length === 6 || referralAddress.length > 30) &&
        referralAddress !== publicKey.toBase58();

      const referralLamports = isReferralValid ? Math.floor(totalLamports * 0.1) : 0;

      const payload = {
        buyerAddress: publicKey.toBase58(),
        mintAddress: selectedVilla.nftAddress,
        amountTokens: investAmount,
        totalLamports: totalLamports,
        referralAddress: isReferralValid ? referralAddress : null,
        referralLamports,
        network: network
      };

      // Call the Next.js backend endpoint 
      const response = await fetch('https://api.thehistorymaker.io/api/solana/build-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to build transaction on server');
      }

      // Safely decode Base64 string to Uint8Array for browser compat
      const binaryString = atob(data.transaction);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) { 
        bytes[i] = binaryString.charCodeAt(i); 
      }
      
      // Reconstruct partially signed transaction from server
      const transaction = Transaction.from(bytes);

      // Prompt Phantom to sign and send the transaction
      console.log("Prompting user to finalize and send Smart Transaction...");
      const signature = await sendTransaction(transaction, connection);
      
      console.log("Solana Transaction Signature:", signature);

      // --- Record referral to database if applicable ---
      if (isReferralValid && signature) {
        try {
          const totalSol = totalLamports / 1e9;
          const commissionSol = referralLamports / 1e9;
          await fetch('https://api.thehistorymaker.io/api/referrals/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referrerAddress: referralAddress,
              investorAddress: publicKey.toBase58(),
              villaId: selectedVilla.id || selectedVilla.nftAddress,
              amountSol: totalSol,
              commissionSol: commissionSol,
              txHash: signature,
            }),
          });
          console.log(`[Referral] Recorded: ${commissionSol} SOL commission to ${referralAddress}`);
        } catch (refErr) {
          // Non-critical — transaction already succeeded, just log the error
          console.warn('[Referral] Failed to record referral in DB:', refErr);
        }
      }

      alert(`Transaction sent! Signature: ${signature}`);
      handleTransactionComplete();
    } catch (error: any) {
      console.error("Solana Transaction failed:", error);
      alert(`Transaction failed: ${error.message}`);
    }
  };


  const handleTransactionComplete = () => {
    setPurchaseSuccess(true);
    setTimeout(() => {
      setPurchaseSuccess(false);
      setSelectedVilla(null);
    }, 8000);
  };

  const wallets = [
    inAppWallet({
      auth: {
        options: ["google", "email", "apple", "facebook", "phone"],
      },
    }),
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
    createWallet("io.rabby"),
    createWallet("app.phantom"), // Added Phantom for Solana support
  ];


  if (isLoading) {
    return (
      <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div id="load">
          <div>G</div>
          <div>N</div>
          <div>I</div>
          <div>D</div>
          <div>A</div>
          <div>O</div>
          <div>L</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: '100px' }}>
      <div className="scene" aria-hidden="true">
        <div className="scene__blob scene__blob--1"></div>
        <div className="scene__blob scene__blob--2"></div>
        <div className="scene__blob scene__blob--3"></div>
      </div>

      <nav className="glass" style={{
        position: 'fixed',
        inset: '14px 14px auto 14px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        borderRadius: '999px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '6px', cursor: 'pointer' }} onClick={() => onNavigate?.('home')}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #fff, #7c5cff)', boxShadow: '0 0 0 6px rgba(124, 92, 255, 0.12)' }}></div>
          <span style={{ fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text-color)' }}>Makers</span>
          <span style={{ marginLeft: '8px', padding: '6px 10px', borderRadius: '999px', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-muted)', fontSize: '12px' }}>Marketplace</span>
        </div>

        <nav className="glass-nav" aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a href="/" onClick={(e) => { e.preventDefault(); onNavigate?.('home'); }} className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>Home</a>
          <a href="/marketplace" onClick={(e) => { e.preventDefault(); onNavigate?.('marketplace'); }} className="glass-btn glass-btn--primary glass-btn--sm" style={{ padding: '9px 12px' }}>Marketplace</a>
          <a href={solanaConnected && wallet?.adapter.name ? `https://api.thehistorymaker.io/?wallet=${encodeURIComponent(wallet.adapter.name)}` : "https://api.thehistorymaker.io/"} className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>Asset & Earning</a>
          <a href="https://docs.thehistorymaker.io/" target="_blank" rel="noopener noreferrer" className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>About Us</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Mobile Hamburger Toggle */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              display: 'none',
              background: 'var(--surface-muted)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-color)',
              padding: '10px',
              borderRadius: '12px',
              cursor: 'pointer',
              zIndex: 1001
            }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="nav-actions-desktop" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', backgroundColor: 'var(--card-border)', padding: '4px', borderRadius: '16px' }}>
              <button
                onClick={() => setNetwork('devnet')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: network === 'devnet' ? 'linear-gradient(90deg, #9945FF, #14F195)' : 'transparent',
                  color: network === 'devnet' ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: network === 'devnet' ? '0 4px 12px rgba(153, 69, 255, 0.3)' : 'none'
                }}
              >
                DEVNET
              </button>
              <button
                onClick={() => setNetwork('mainnet')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: network === 'mainnet' ? 'linear-gradient(90deg, #14F195, #9945FF)' : 'transparent',
                  color: network === 'mainnet' ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: network === 'mainnet' ? '0 4px 12px rgba(20, 241, 149, 0.3)' : 'none'
                }}
              >
                MAINNET
              </button>
            </div>

            <div style={{ display: 'flex', backgroundColor: 'var(--card-border)', padding: '4px', borderRadius: '12px' }}>
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>

            <div className="solana-connect-button-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {publicKey && (
                <button
                  className="glass-btn glass-btn--ghost glass-btn--sm"
                  onClick={copyReferralLink}
                  style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-violet)' }}
                >
                  Copy Referral Link
                </button>
              )}
              <div className="solana-adapter-wrapper">
                <WalletMultiButton style={{ backgroundColor: '#9945FF', borderRadius: '12px', height: '44px', padding: '0 24px' }} />
              </div>
            </div>
          </div>
        </div>

      </nav>

      {/* Mobile Menu Drawer */}
      <div className={`mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`} style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '280px',
        height: '100vh',
        backgroundColor: 'var(--card-bg)',
        zIndex: 2000,
        padding: '80px 24px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
        transition: 'transform 0.3s ease-in-out',
        transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
        borderLeft: '1px solid var(--card-border)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>NAVIGATION</span>
          <a href="/" style={{ color: 'var(--text-color)', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700 }}>Home</a>
          <a href="#" style={{ color: '#9945FF', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700 }}>Marketplace</a>
          <a href={solanaConnected && wallet?.adapter.name ? `https://api.thehistorymaker.io/?wallet=${encodeURIComponent(wallet.adapter.name)}` : "https://api.thehistorymaker.io/"} style={{ color: 'var(--text-color)', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700 }}>Asset & Earning</a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>NETWORK</span>
          <div style={{ display: 'flex', backgroundColor: 'var(--card-border)', padding: '4px', borderRadius: '16px', width: 'fit-content' }}>
            <button
              onClick={() => { setNetwork('devnet'); setIsMobileMenuOpen(false); }}
              style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', background: network === 'devnet' ? 'linear-gradient(90deg, #9945FF, #14F195)' : 'transparent', color: network === 'devnet' ? 'white' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800 }}
            >DEVNET</button>
            <button
              onClick={() => { setNetwork('mainnet'); setIsMobileMenuOpen(false); }}
              style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', background: network === 'mainnet' ? 'linear-gradient(90deg, #14F195, #9945FF)' : 'transparent', color: network === 'mainnet' ? 'white' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800 }}
            >MAINNET</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>THEME</span>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--surface-muted)', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}
          >
            {theme === 'light' ? <><Moon size={20} /> Dark Mode</> : <><Sun size={20} /> Light Mode</>}
          </button>
        </div>

        <div className="solana-adapter-wrapper" style={{ marginTop: 'auto' }}>
          <WalletMultiButton style={{ backgroundColor: '#9945FF', borderRadius: '12px', height: '44px', width: '100%' }} />
        </div>
      </div>

      {/* Overlay for Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1500 }}
        />
      )}

      <main className="dashboard-grid">
        {villas.map((villa) => {
          const tokensSold = villa.tokensSold || 0;

          return (
            <div key={villa.id} className="glass glass-card" style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', height: '240px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                {villa.images?.[0]?.endsWith('.mp4') ? (
                  <video
                    src={villa.images[0]}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img src={villa.images?.[0] || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800'} alt={villa.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div className="glass-badge glass-badge--violet" style={{ position: 'absolute', top: '16px', left: '16px', fontSize: '0.75rem', color: '#1a1a1a', fontWeight: 800 }}>
                  <span className="glass-badge__dot"></span> APY {villa.apy}%
                </div>
                <div className="glass-badge glass-badge--aqua" style={{ position: 'absolute', bottom: '16px', right: '16px', fontSize: '0.75rem', background: 'var(--accent-aqua)', color: '#000', border: 'none' }}>
                  {villa.chain === 'solana' ? `◎ ${(0.02).toFixed(3)} / NFT` : `$${villa.pricePerShare} / token`}
                </div>
              </div>

              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color)' }}>{villa.name}</h3>
                  <TrendingUp size={20} color="#9945FF" />
                </div>
                <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>
                  <MapPin size={14} /> {villa.location}
                </p>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--bg-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}><Bed size={16} color="#9945FF" /> {villa.bedrooms} Beds</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}><Bath size={16} color="#9945FF" /> {villa.bathrooms} Baths</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}><Layout size={16} color="#9945FF" /> {villa.sqm} m²</div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Funding Progress</span>
                    <span style={{ fontWeight: 800, color: '#14f195' }}>
                      {tokensSold.toLocaleString()} / {villa.totalTokens.toLocaleString()} ({((tokensSold / villa.totalTokens) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="progress-bar" style={{ backgroundColor: 'var(--glass-white-lg)' }}>
                    <div className="progress-bar__fill" style={{ width: `${(tokensSold / villa.totalTokens) * 100}%` }}></div>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {(tokensSold || 0).toLocaleString()} / {(villa.totalTokens || 0).toLocaleString()} tokens sold
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                    <div style={{ fontSize: '0.65rem', color: '#ffffff', marginBottom: '4px', fontWeight: 800 }}>APY</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>{villa.apy}%</div>
                  </div>
                  <div style={{ background: 'var(--surface-muted)', padding: '12px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>STATUS</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#14f195' }}>{villa.occupancyStatus}</div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedVilla(villa)}
                  style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #9945FF', background: 'transparent', color: '#9945FF', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  Analyze & Invest <ChevronRight size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {selectedVilla && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'var(--modal-overlay)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '32px', border: '1px solid var(--card-border)', width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button
              onClick={() => setSelectedVilla(null)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-color)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}
            >
              ✕
            </button>

            {purchaseSuccess ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--success-bg)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 24px auto' }}>
                  <CheckCircle2 color="#10b981" size={48} />
                </div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px', color: 'var(--text-color)' }}>Investment Successful!</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 30px auto' }}>
                  You have successfully acquired {investAmount} shares of {selectedVilla.name}. Your ownership certificate will be issued to your wallet shortly.
                </p>
                <button
                  onClick={() => setSelectedVilla(null)}
                  style={{ background: 'linear-gradient(90deg, #9945FF, #14F195)', border: 'none', color: 'white', padding: '16px 40px', borderRadius: '16px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(153, 69, 255, 0.3)' }}
                >
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: 'var(--text-color)' }}>{selectedVilla.name}</h2>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#9945FF' }}>{selectedVilla.location}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2.5rem' }}>
                  <div>
                    {selectedVilla.images?.[0]?.endsWith('.mp4') ? (
                      <video
                        src={selectedVilla.images[0]}
                        style={{ width: '100%', borderRadius: '24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img src={selectedVilla.images?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800'} alt={selectedVilla.name} style={{ width: '100%', borderRadius: '24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    )}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                      <button style={{ backgroundColor: '#9945FF', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700 }}>Overview</button>
                      <button style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-muted)', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700 }}>Legal Structure</button>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7' }}>
                      {selectedVilla.description || `This premium RWA asset represents a ${selectedVilla.bedrooms}-bedroom villa in ${selectedVilla.location}. Fractionalized into ${selectedVilla.totalTokens.toLocaleString()} tokens, it offers a unique entry into the Bali hospitality market with audited yields.`}
                    </div>
                  </div>

                  <div>
                    <div style={{ background: 'rgba(153, 69, 255, 0.03)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(153, 69, 255, 0.1)', marginBottom: '30px' }}>
                      <h4 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#9945FF', fontWeight: 800 }}>
                        <Calculator size={20} /> Investment Calculator
                      </h4>
                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '8px' }}>QUANTITY (SHARES)</label>
                        <input
                          type="number"
                          value={investAmount}
                          onChange={(e) => setInvestAmount(Math.max(1, parseInt(e.target.value) || 1))}
                          style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--card-border)', padding: '16px', borderRadius: '16px', color: 'var(--text-color)', fontSize: '1.25rem', fontWeight: 800 }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--card-border)' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Asset Price</span>
                          <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-color)' }}>{(investAmount * (0.02)).toFixed(3)} SOL</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Est. USD Cost</span>
                          <span>${(investAmount * 0.02 * solPriceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '8px' }}>REFERRAL WALLET ADDRESS (OPTIONAL)</label>
                          <input
                            type="text"
                            placeholder="Enter Solana wallet address"
                            value={referralAddress}
                            onChange={(e) => setReferralAddress(e.target.value)}
                            style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: '12px', color: 'var(--text-color)', fontSize: '0.9rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffffff', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--card-border)' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Est. Annual Yield (APY)</span>
                        <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>+ {(investAmount * (0.02) * (parseFloat(selectedVilla.apy) / 100)).toFixed(4)} SOL</span>
                      </div>
                    </div>

                    {/* Affiliate / Referral Section */}
                    {publicKey && (
                      <div style={{ marginBottom: '24px', background: 'linear-gradient(145deg, rgba(153,69,255,0.1) 0%, rgba(20,241,149,0.05) 100%)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(153,69,255,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <h4 style={{ fontSize: '1rem', color: 'var(--accent-violet)', margin: '0 0 6px 0', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <TrendingUp size={18} /> Affiliate Program
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Invite investors to this asset and automatically earn a <strong style={{ color: 'var(--accent-aqua)' }}>10% split</strong> directly to your wallet upon successful transaction.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={copyReferralLink}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '12px',
                            background: 'rgba(153,69,255,0.2)',
                            color: 'var(--accent-violet)',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            border: '1px dashed rgba(153,69,255,0.5)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Globe size={16} /> Generate & Copy My Referral Link
                        </button>
                      </div>
                    )}


                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 800 }}>INSTANT ASSET ACQUISITION</h4>

                      {selectedVilla.nftAddress ? (
                        <button
                          onClick={handleSolanaAcquisition}
                          style={{
                            width: '100%',
                            padding: '20px',
                            borderRadius: '20px',
                            background: 'linear-gradient(90deg, #9945FF, #14F195)',
                            color: 'white',
                            fontWeight: 900,
                            fontSize: '1.1rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 8px 25px rgba(153, 69, 255, 0.4)',
                            transition: 'all 0.3s'
                          }}
                        >
                          <CloudLightning size={24} />
                          {publicKey ? `Invest ${investAmount} Shares (SOL)` : "Connect Wallet to Invest"}
                        </button>
                      ) : (
                        <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2', color: '#ef4444', fontSize: '0.85rem' }}>
                          Invalid NFT Address: {selectedVilla.nftAddress || 'Missing Address'}. This asset cannot be acquired on-chain yet.
                        </div>
                      )}
                    </div>

                    <div style={{ background: 'var(--surface-muted)', padding: '20px', borderRadius: '20px', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <ShieldCheck size={24} color="#14f195" />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Secured Transaction: Payments and on-chain share distribution are handled synchronously via Solana Network.
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
