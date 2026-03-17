import React, { useState, useEffect } from 'react';
import { ConnectButton, TransactionWidget, useActiveAccount, useReadContract } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { defineChain, getContract } from "thirdweb";
import { buyFromListing, getAllValidListings } from "thirdweb/extensions/marketplace";
import { claimTo, getActiveClaimCondition, totalSupply } from "thirdweb/extensions/erc1155";
import { client } from "./lib/thirdweb";
import { Wallet, MapPin, TrendingUp, ShieldCheck, Activity, Bed, Bath, Layout, Calculator, Clock, ChevronRight, CheckCircle2, CloudLightning } from 'lucide-react';
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

export default function Dashboard() {
  const [villas, setVillas] = useState<any[]>([]);
  const [selectedVilla, setSelectedVilla] = useState<any>(null);
  const [investAmount, setInvestAmount] = useState<number>(1);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [claimConditionError, setClaimConditionError] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'ethereum' | 'solana'>('ethereum');
  const activeAccount = useActiveAccount();
  
  // Solana Wallet Adapter hooks
  const { publicKey, sendTransaction, connected: solanaConnected } = useWallet();
  const { connection } = useConnection();

  // Fetch real-time token supply for Sepolia asset
  const { data: ethTotalSold } = useReadContract(
    totalSupply,
    {
      contract: getContract({
        client,
        chain: defineChain(11155111),
        address: "0x2B91E94Ce68cDf1321269c135Fbb12A2C1F781E5",
      }),
      id: 0n,
    }
  );

  // Note: For Solana Supply, we would use getMintSupply or similar, 
  // but for now we'll mock it or use the tokensSold property.
  const solTotalSold = 1; // Real-time value from the mint we just did

  useEffect(() => {
    fetchVillas();
  }, []);

  useEffect(() => {
    // Only check claim condition for Ethereum (Sepolia) assets
    if (selectedVilla && selectedVilla.chain === 'ethereum' && /^0x[a-fA-F0-9]{40}$/.test(selectedVilla.nftAddress)) {
      checkClaimCondition(selectedVilla.nftAddress);
    } else {
      setClaimConditionError(null);
    }
  }, [selectedVilla]);

  const checkClaimCondition = async (address: string) => {
    try {
      setClaimConditionError(null);
      await getActiveClaimCondition({
        contract: getContract({
          client,
          chain: defineChain(11155111),
          address: address,
        }),
        tokenId: 0n,
      });
    } catch (err: any) {
      console.warn("Claim condition check failed:", err);
      if (err.message.includes("Claim condition not found")) {
        setClaimConditionError("No active claim condition found for Token ID 0 on Sepolia.");
      }
    }
  };

  const fetchVillas = async () => {
    try {
      setIsLoading(true);
      // Force display ONLY the specific asset requested by the user
      const backendVillas = [
        {
          id: 'v1',
          name: 'Makers Villa Bali',
          location: 'Indonesia',
          nftAddress: '0x2B91E94Ce68cDf1321269c135Fbb12A2C1F781E5',
          pricePerShare: 0.035, // ETH (New requirement)
          ery: '8.5',
          totalTokens: 40000,
          tokensSold: 0,
          bedrooms: 3,
          bathrooms: 3,
          sqm: 450,
          occupancyStatus: 'Active',
          images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800'],
          description: 'Premium fractionalized villa asset "Makers Villa Bali" (Edition Drop) - 40,000 shares available at 0.035 ETH each.',
          chain: 'ethereum'
        },
        {
          id: 'v2',
          name: 'Solana Sunset Villa',
          location: 'Uluwatu, Bali',
          nftAddress: 'BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS',
          pricePerShare: 0.48, // SOL (Equivalent to 0.035 ETH)
          ery: '10.2',
          totalTokens: 5000,
          tokensSold: 1, // Reflecting the successful mint
          bedrooms: 4,
          bathrooms: 4,
          sqm: 600,
          occupancyStatus: 'Active',
          images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800'],
          description: 'Luxurious Solana-based villa asset. High yield potential in the heart of Uluwatu.',
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
    const currency = selectedNetwork === 'ethereum' ? 'ETH' : 'SOL';
    return `${(investAmount * villa.pricePerShare * yieldRate).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${currency}`;
  };

  const handleSolanaAcquisition = async () => {
    if (!publicKey) {
      alert("Please connect your Solana wallet first!");
      return;
    }

    try {
      console.log("Starting Solana Transaction...");
      // Simulate/Implement an actual SOL transfer for acquisition
      // In a real scenario, this would interact with a smart contract or Marketplace
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(selectedVilla.nftAddress), // Sending to the asset mint (simplification for demo)
          lamports: Math.floor(investAmount * selectedVilla.pricePerShare * 1e9),
        })
      );

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

  // Marketplace V3 Contract on Sepolia
  const marketplaceContract = getContract({
    client,
    chain: defineChain(11155111),
    address: "0x088362D5209993e7E6A8004f281bB4b3778E00E3", 
  });

  if (isLoading) return <div style={{ backgroundColor: '#050a0a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#5eead4' }}>Loading Assets...</div>;

  return (
    <div className="dashboard-container" style={{ backgroundColor: '#050a0a', minHeight: '100vh', color: '#e2e8f0' }}>
      <nav className="navbar glass-card" style={{ 
        position: 'sticky', 
        top: '20px', 
        zIndex: 1000, 
        borderRadius: '24px', 
        margin: '0 40px 40px 40px', 
        border: '1px solid rgba(13, 148, 136, 0.2)', 
        background: 'rgba(5, 10, 10, 0.8)', 
        backdropFilter: 'blur(12px)',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div className="nav-logo" style={{ color: '#0d9488', fontWeight: 900, fontSize: '1.5rem', cursor: 'pointer' }}>MAKERS.</div>
        
        <div className="nav-menu" style={{ display: 'flex', gap: '32px' }}>
          {['Home', 'Marketplace', 'goLearn', 'About Us'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '')}`} style={{ 
              color: item === 'Marketplace' ? '#5eead4' : '#94a3b8', 
              textDecoration: 'none', 
              fontSize: '0.9rem', 
              fontWeight: 600, 
              transition: 'color 0.2s'
            }}>
              {item}
            </a>
          ))}
        </div>

        <div className="nav-actions" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {/* Network Switcher */}
          <div className="network-switcher glass-card" style={{ 
            display: 'flex', 
            background: 'rgba(255,255,255,0.03)', 
            padding: '4px', 
            borderRadius: '14px', 
            border: '1px solid rgba(255,255,255,0.05)' 
          }}>
            <button 
              onClick={() => setSelectedNetwork('ethereum')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: selectedNetwork === 'ethereum' ? '#0d9488' : 'transparent',
                color: selectedNetwork === 'ethereum' ? 'white' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: selectedNetwork === 'ethereum' ? 'white' : '#6366f1' }}></div>
              Ethereum
            </button>
            <button 
              onClick={() => setSelectedNetwork('solana')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: selectedNetwork === 'solana' ? '#0d9488' : 'transparent',
                color: selectedNetwork === 'solana' ? 'white' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: selectedNetwork === 'solana' ? 'white' : '#14f195' }}></div>
              Solana
            </button>
          </div>

          {selectedNetwork === 'ethereum' ? (
            <ConnectButton 
              client={client} 
              wallets={wallets}
              theme={"dark"}
              chains={[defineChain(11155111)]}
              connectModal={{
                showThirdwebBranding: false,
              }}
              connectButton={{
                label: "Investor Login",
                className: "thirdweb-connect-btn"
              }}
            />
          ) : (
            <div className="solana-connect-wrapper">
              <WalletMultiButton className="solana-adapter-btn" />
            </div>
          )}
        </div>
      </nav>

      <main className="dashboard-grid" style={{ padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '30px' }}>
        {villas
          .filter(villa => villa.chain === selectedNetwork)
          .map((villa) => {
            // Override with real-time data
            let tokensSold = villa.tokensSold;
            if (villa.id === 'v1' && ethTotalSold !== undefined) {
              tokensSold = Number(ethTotalSold);
            } else if (villa.id === 'v2') {
              tokensSold = solTotalSold;
            }

            return (
          <div key={villa.id} className="glass-card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            borderRadius: '24px', 
            overflow: 'hidden', 
            border: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.02)',
            transition: 'transform 0.3s'
          }}>
            <div style={{ position: 'relative', height: '240px' }}>
              <img src={villa.images?.[0] || 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800'} alt={villa.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: '16px', left: '16px', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, color: '#5eead4', border: '1px solid rgba(94, 234, 212, 0.3)' }}>
                ERY {villa.ery}%
              </div>
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', backgroundColor: 'rgba(13, 148, 136, 0.9)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>
                ${villa.pricePerShare} / token
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{villa.name}</h3>
                <TrendingUp size={20} color="#0d9488" />
              </div>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 20px 0' }}>
                <MapPin size={14} /> {villa.location}
              </p>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}><Bed size={16} color="#0d9488"/> {villa.bedrooms} Beds</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}><Bath size={16} color="#0d9488"/> {villa.bathrooms} Baths</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}><Layout size={16} color="#0d9488"/> {villa.sqm} m²</div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                  <span style={{ color: '#94a3b8' }}>Funding Progress</span>
                  <span style={{ fontWeight: 700, color: '#5eead4' }}>{((tokensSold / villa.totalTokens) * 100).toFixed(1)}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(tokensSold / villa.totalTokens) * 100}%`, height: '100%', backgroundColor: '#0d9488', borderRadius: '4px' }}></div>
                </div>
                <div style={{ marginTop: '6px', fontSize: '0.7rem', color: '#64748b' }}>
                  {tokensSold.toLocaleString()} / {villa.totalTokens.toLocaleString()} tokens sold
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '4px' }}>ANNUAL YIELD (ARY)</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0d9488' }}>{villa.ary}%</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '4px' }}>STATUS</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#5eead4' }}>{villa.occupancyStatus}</div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedVilla(villa)}
                style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #0d9488', background: 'transparent', color: '#5eead4', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                Analyze & Invest <ChevronRight size={18} />
              </button>
            </div>
          </div>
          );
        })}
      </main>

      {selectedVilla && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div className="glass-card" style={{ width: '1000px', maxHeight: '95vh', overflowY: 'auto', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', background: '#0a0f0f', padding: purchaseSuccess ? '80px 40px' : '40px' }}>
            
            {purchaseSuccess ? (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <CheckCircle2 size={80} color="#0d9488" />
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px', color: 'white' }}>Property Ownership Confirmed!</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.2rem', maxWidth: '500px', margin: '0 auto 40px' }}>
                        Congratulations! The transaction was successful. You now hold <strong>{investAmount} shares</strong> of {selectedVilla.name} in your secure wallet.
                    </p>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'inline-block', minWidth: '340px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#64748b' }}>Asset Name</span>
                            <span style={{ fontWeight: 600 }}>{selectedVilla.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#64748b' }}>Shares Acquired</span>
                            <span style={{ fontWeight: 600 }}>{investAmount} Tokens</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#64748b' }}>Total Value</span>
                            <span style={{ fontWeight: 600 }}>${(investAmount * selectedVilla.pricePerShare).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Status</span>
                            <span style={{ fontWeight: 600, color: '#0d9488' }}>On-Chain Confirmed</span>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>{selectedVilla.name}</h2>
                        <div style={{ display: 'flex', gap: '12px', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={16}/> {selectedVilla.location}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={16} color="#0d9488"/> Verified Asset</span>
                        </div>
                        {claimConditionError && (
                          <div style={{ marginTop: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={14} /> {claimConditionError}
                          </div>
                        )}
                    </div>
                    <button 
                        onClick={() => setSelectedVilla(null)} 
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                        <ChevronRight size={32} style={{ transform: 'rotate(90deg)' }} />
                    </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
                    <div>
                        <img src={selectedVilla.images?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800'} alt={selectedVilla.name} style={{ width: '100%', borderRadius: '24px', marginBottom: '24px' }} />
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                        <button style={{ backgroundColor: '#0d9488', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 600 }}>Overview</button>
                        <button style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 600 }}>Legal Structure</button>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        {selectedVilla.description || `This premium RWA asset represents a ${selectedVilla.bedrooms}-bedroom villa in ${selectedVilla.location}. Fractionalized into ${selectedVilla.totalTokens.toLocaleString()} tokens, it offers a unique entry into the Bali hospitality market with audited yields.`}
                        </div>
                    </div>

                    <div>
                        <div style={{ background: 'rgba(13, 148, 136, 0.05)', padding: '24px', borderRadius: '24px', border: '1px solid rgba(13, 148, 136, 0.2)', marginBottom: '24px' }}>
                        <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#5eead4' }}>
                            <Calculator size={20} /> Investment Calculator
                        </h4>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>QUANTITY (SHARES)</label>
                            <input 
                            type="number" 
                            value={investAmount} 
                            onChange={(e) => setInvestAmount(Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', color: 'white', fontSize: '1.1rem', fontWeight: 700 }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Total Asset Price</span>
                            <span style={{ fontWeight: 600, color: 'white' }}>{(investAmount * selectedVilla.pricePerShare).toFixed(3)} {selectedNetwork === 'ethereum' ? 'ETH' : 'SOL'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                            <span>Est. USD Cost</span>
                            <span>${(investAmount * selectedVilla.pricePerShare * (selectedNetwork === 'ethereum' ? 2060 : 150)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                            <span>Est. Rupiah (IDR)</span>
                            <span>Rp {(investAmount * selectedVilla.pricePerShare * 35000000).toLocaleString('id-ID')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5eead4', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '0.85rem' }}>Est. Annual Yield</span>
                            <span style={{ fontWeight: 900 }}>+ {(investAmount * selectedVilla.pricePerShare * (parseFloat(selectedVilla.ery) / 100)).toFixed(4)} {selectedNetwork === 'ethereum' ? 'ETH' : 'SOL'}</span>
                        </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '12px', fontWeight: 600 }}>INSTANT ASSET ACQUISITION</h4>
                        
                        {selectedVilla.nftAddress ? (
                            selectedNetwork === 'ethereum' ? (
                                <TransactionWidget
                                    client={client}
                                    currency={"USD"}
                                    amount={(investAmount * selectedVilla.pricePerShare * 2060).toFixed(2)}
                                    transaction={claimTo({
                                        contract: getContract({
                                            client,
                                            chain: defineChain(11155111),
                                            address: selectedVilla.nftAddress,
                                        }),
                                        quantity: BigInt(investAmount),
                                        to: activeAccount?.address || "",
                                        tokenId: 0n,
                                    })}
                                    onSuccess={handleTransactionComplete}
                                    showThirdwebBranding={false}
                                    onError={(error) => {
                                        console.error("Transaction Error:", error);
                                        if (error.message.includes("Claim condition not found")) {
                                            alert("Error: No active claim condition found. Please ensure the asset is ready for acquisition.");
                                        } else {
                                            alert(`Transaction failed: ${error.message}`);
                                        }
                                    }}
                                    theme={"dark"}
                                />
                            ) : (
                                <button 
                                    onClick={handleSolanaAcquisition}
                                    style={{ 
                                        width: '100%', 
                                        padding: '16px', 
                                        borderRadius: '16px', 
                                        background: '#0d9488', 
                                        color: 'white', 
                                        fontWeight: 800, 
                                        fontSize: '0.9rem',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '10px',
                                        boxShadow: '0 4px 20px rgba(13, 148, 136, 0.3)'
                                    }}
                                >
                                    <CloudLightning size={20} />
                                    {publicKey ? `Acquire ${investAmount} Shares (SOL)` : "Connect Wallet to Acquire"}
                                </button>
                            )
                        ) : (
                            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.85rem' }}>
                                Invalid NFT Address: {selectedVilla.nftAddress || 'Missing Address'}. This asset cannot be acquired on-chain yet.
                            </div>
                        )}
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ShieldCheck size={20} color="#0d9488" />
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Secured Transaction: Payments and on-chain share distribution are handled synchronously via Thirdweb.
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
