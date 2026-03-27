import React, { useState, useEffect } from 'react';
import { ConnectButton, useReadContract } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { defineChain, getContract } from "thirdweb";
import { buyFromListing, getAllValidListings } from "thirdweb/extensions/marketplace";
import { totalSupply } from "thirdweb/extensions/erc1155";
import { client } from "./lib/thirdweb";
import { Wallet, MapPin, TrendingUp, ShieldCheck, Activity, Bed, Bath, Layout, Calculator, Clock, ChevronRight, CheckCircle2, CloudLightning, Sun, Moon } from 'lucide-react';
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

// Treasury Wallet Address (Multisig Squads)
// Owners: 
// 1. 6vSg9Wjodtn5YiGq3A4npRg9ffDQgi8AnBAYA5DovdoL
// 2. 4tbNceS9JRKt14A9WUcdRfgTG5SbNiDcvcQKMr28fB5S
// 3. 4KcjU8zKHQjWkngDEx2337v3u4woiZMxXchMsbSUCeGm
// 4. 41MLp5oX9yYwNoMCcQUw9ZRZQazEacU5JThrGv6E5wMU
// Threshold: 3/4
const TREASURY_WALLET_ADDRESS = '41MLp5oX9yYwNoMCcQUw9ZRZQazEacU5JThrGv6E5wMU';

export default function Dashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [villas, setVillas] = useState<any[]>([]);
  const [selectedVilla, setSelectedVilla] = useState<any>(null);
  const [investAmount, setInvestAmount] = useState<number>(1);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [claimConditionError, setClaimConditionError] = useState<string | null>(null);
  const [solPriceUsd, setSolPriceUsd] = useState<number>(150);
  const [idrRate, setIdrRate] = useState<number>(15500 * 150);
  const [referralAddress, setReferralAddress] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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
  }, []);

  const extractReferral = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref && ref.length > 30) {
        setReferralAddress(ref);
        console.log("Referral address detected from URL:", ref);
      }
    } catch (e) {
      console.warn("Failed to extract referral from URL", e);
    }
  };

  const copyReferralLink = () => {
    if (!publicKey) {
      alert("Please connect your Solana wallet first to generate your referral link!");
      return;
    }
    const link = `${window.location.origin}${window.location.pathname}?ref=${publicKey.toBase58()}`;
    navigator.clipboard.writeText(link);
    alert("Referral link copied to clipboard: " + link);
  };

  const fetchSolPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd,idr');
      const data = await response.json();
      if (data.solana && data.solana.usd) {
        setSolPriceUsd(data.solana.usd);
        setIdrRate(data.solana.idr); // Assuming setIdrRate is the correct setter for IDR price
      } else {
        throw new Error("Invalid price data");
      }
    } catch (e) {
      console.error("Failed to fetch SOL price, using fallback", e);
      // Fallback price if API times out or fails
      if (solPriceUsd === 0) setSolPriceUsd(150);
    }
  };

  useEffect(() => {
    setClaimConditionError(null);
  }, [selectedVilla]);


  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchTokenSupply = async (mintAddress: string) => {
    try {
      const mintPubkey = new PublicKey(mintAddress);

      // Get Total Supply
      const supplyInfo = await connection.getTokenSupply(mintPubkey);
      const totalSupply = supplyInfo.value.uiAmount || 0;

      // Get Treasury Balance (tokens NOT sold yet)
      try {
        const treasuryPubkey = new PublicKey(TREASURY_WALLET_ADDRESS);
        const tokenAccounts = await connection.getTokenAccountsByOwner(treasuryPubkey, { mint: mintPubkey });

        let treasuryBalance = 0;
        if (tokenAccounts.value.length > 0) {
          const balanceRecord = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
          treasuryBalance = balanceRecord.value.uiAmount || 0;
        }

        // Sold = Total Supply - Treasury Balance
        const sold = Math.max(0, totalSupply - treasuryBalance);
        return sold;
      } catch (balErr) {
        console.warn(`Could not fetch treasury balance for ${mintAddress}, returning total supply:`, balErr);
        return totalSupply; // Fallback to total supply if treasury check fails
      }
    } catch (e) {
      console.error(`Failed to fetch supply for ${mintAddress}:`, e);
      return 0;
    }
  };

  const fetchVillas = async () => {
    try {
      setIsLoading(true);
      // Force display ONLY the specific asset requested by the user
      // Real NFT Mint Addresses on Solana Devnet
      // Real NFT Mint Addresses on Solana Devnet
      // REPLACE these with your own Mint Addresses as you deploy them!
      const REAL_NFT_ADDRESSES = {
        v1: 'BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS', // Makers Sunset Villa
        v2: 'd4Qqt3UzxcQBhqpRBZcQzknokCiGA82RRMzzwXBPYUg', // Placeholder
        v3: 'GABXPkqndQ7Fb7C2CST4pff1VkQXjcCtuvCdPpSRuQHy', // Placeholder
        v4: '5uNBRRYNEux1GovaiRrgaGJAHRUBp8hXQqNMdkFgFVf8', // Placeholder
      };

      const v1Sold = await fetchTokenSupply(REAL_NFT_ADDRESSES.v1);
      await delay(500);
      const v2Sold = await fetchTokenSupply(REAL_NFT_ADDRESSES.v2);
      await delay(500);
      const v3Sold = await fetchTokenSupply(REAL_NFT_ADDRESSES.v3);
      await delay(500);
      const v4Sold = await fetchTokenSupply(REAL_NFT_ADDRESSES.v4);

      const backendVillas = [
        {
          id: 'v1',
          name: 'Uluwatu Cliffside Villa',
          location: 'Uluwatu, Bali',
          nftAddress: REAL_NFT_ADDRESSES.v1,
          pricePerShareUsd: 100,
          ery: '12.5',
          ary: '12.5',
          totalTokens: 40000,
          tokensSold: v1Sold,
          bedrooms: 4,
          bathrooms: 4,
          sqm: 850,
          occupancyStatus: 'Active',
          images: ['/assets/Villa 1.gif.mp4'],
          description: 'Premium fractionalized modern cliffside villa in Uluwatu, Bali. 40,000 shares available.',
          chain: 'solana'
        },
        {
          id: 'v2',
          name: 'Ubud Jungle Retreat',
          location: 'Ubud, Bali',
          nftAddress: REAL_NFT_ADDRESSES.v2,
          pricePerShareUsd: 100,
          ery: '9.2',
          ary: '9.2',
          totalTokens: 40000,
          tokensSold: v2Sold,
          bedrooms: 3,
          bathrooms: 3,
          sqm: 450,
          occupancyStatus: 'Active',
          images: ['/assets/Villa 2.gif.mp4'],
          description: 'Luxury tropical jungle villa in Ubud, surrounded by palm trees. 40,000 shares available.',
          chain: 'solana'
        },
        {
          id: 'v3',
          name: 'Seminyak Beachfront Villa',
          location: 'Seminyak, Bali',
          nftAddress: REAL_NFT_ADDRESSES.v3,
          pricePerShareUsd: 100,
          ery: '14.0',
          ary: '14.0',
          totalTokens: 40000,
          tokensSold: v3Sold,
          bedrooms: 5,
          bathrooms: 5,
          sqm: 1200,
          occupancyStatus: 'Active',
          images: ['/assets/Villa 3.gif.mp4'],
          description: 'Exclusive luxury beachfront villa in Seminyak, perfect for sunset views. 40,000 shares available.',
          chain: 'solana'
        },
        {
          id: 'v4',
          name: 'Canggu Eco Villa',
          location: 'Canggu, Bali',
          nftAddress: REAL_NFT_ADDRESSES.v4,
          pricePerShareUsd: 100,
          ery: '11.0',
          ary: '11.0',
          totalTokens: 40000,
          tokensSold: v4Sold,
          bedrooms: 3,
          bathrooms: 3,
          sqm: 400,
          occupancyStatus: 'Active',
          images: ['/assets/Villa 4.gif.mp4'],
          description: 'Minimalist eco-friendly villa with stunning rice terrace views in Canggu. 40,000 shares available.',
          chain: 'solana'
        }
      ];

      setVillas(backendVillas);
      setIsLoading(false);
    } catch (err) {
      console.error('Sync villas error:', err);
      setVillas([]);
      setIsLoading(false);
    }
  };

  const calculateReturn = (villa: any) => {
    const yieldRate = parseFloat(villa.ery) / 100;
    const pricePerShareSol = 100 / solPriceUsd;
    return `${(investAmount * pricePerShareSol * yieldRate).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
  };

  const handleSolanaAcquisition = async () => {
    if (!publicKey) {
      alert("Please connect your Solana wallet first!");
      return;
    }

    try {
      console.log("Starting Solana Transaction with $100 peg and Referral Split...");

      const pricePerShareSol = 100 / solPriceUsd;
      const totalLamports = Math.floor(investAmount * pricePerShareSol * 1e9);
      const sellerPubkey = new PublicKey(TREASURY_WALLET_ADDRESS);

      const transaction = new Transaction();

      if (referralAddress && referralAddress.length > 20) {
        try {
          const referralPubkey = new PublicKey(referralAddress);
          const referralLamports = Math.floor(totalLamports * 0.1);
          const sellerLamports = totalLamports - referralLamports;

          transaction.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: sellerPubkey,
              lamports: sellerLamports,
            }),
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: referralPubkey,
              lamports: referralLamports,
            })
          );
          console.log(`Split transaction: 90% logic engaged. 10% to ${referralAddress}`);
        } catch (e) {
          console.warn("Invalid referral address, sending 100% to seller");
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: sellerPubkey,
              lamports: totalLamports,
            })
          );
        }
      } else {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: sellerPubkey,
            lamports: totalLamports,
          })
        );
      }

      const signature = await sendTransaction(transaction, connection);
      console.log("Solana Transaction Signature:", signature);
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
          <a href={solanaConnected && wallet?.adapter.name ? `http://localhost:3001/?wallet=${encodeURIComponent(wallet.adapter.name)}` : "http://localhost:3001/"} className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>Asset & Earning</a>
          <a href="/about" onClick={(e) => { e.preventDefault(); onNavigate?.('about'); }} className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>About Us</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
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
      </nav>

      <main className="dashboard-grid" style={{ padding: '60px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '40px' }}>
        {villas.map((villa) => {
          const tokensSold = villa.tokensSold || 0;

          return (
            <div key={villa.id} className="glass glass-card" style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 0
            }}>
              <div style={{ position: 'relative', height: '240px' }}>
                {villa.images?.[0]?.endsWith('.mp4') ? (
                  <video
                    src={villa.images[0]}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img src={villa.images?.[0] || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800'} alt={villa.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div className="glass-badge glass-badge--violet" style={{ position: 'absolute', top: '16px', left: '16px', fontSize: '0.75rem' }}>
                  <span className="glass-badge__dot"></span> ERY {villa.ery}%
                </div>
                <div className="glass-badge glass-badge--aqua" style={{ position: 'absolute', bottom: '16px', right: '16px', fontSize: '0.75rem', background: 'var(--accent-aqua)', color: '#000', border: 'none' }}>
                  {villa.chain === 'solana' ? `◎ ${(100 / solPriceUsd).toFixed(3)} / NFT` : `$${villa.pricePerShare} / token`}
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
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ANNUAL YIELD (ARY)</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#9945FF' }}>{villa.ary}%</div>
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
                          <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-color)' }}>{(investAmount * (100 / solPriceUsd)).toFixed(3)} SOL</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Est. USD Cost</span>
                          <span>${(investAmount * 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Est. Rupiah (IDR)</span>
                          <span>Rp {(investAmount * 100 * (idrRate / solPriceUsd || 15500)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
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

                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#14f195', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--card-border)' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Est. Annual Yield</span>
                        <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>+ {(investAmount * (100 / solPriceUsd) * (parseFloat(selectedVilla.ery) / 100)).toFixed(4)} SOL</span>
                      </div>
                    </div>

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
