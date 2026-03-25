'use client';

import React, { useState, useEffect } from 'react';
import './erp.css';
import { 
    Home, 
    Layers, 
    DollarSign, 
    BarChart3, 
    ChevronLeft, 
    ChevronRight, 
    User, 
    Plus, 
    ArrowRight, 
    Pencil, 
    Trash2, 
    Activity, 
    Database, 
    Download,
    Eye,
    Globe,
    ShieldCheck,
    Settings
} from 'lucide-react';
import { ConnectButton, useActiveAccount, useReadContract } from "thirdweb/react";
import { client } from "../lib/thirdweb";
import { defineChain, getContract } from "thirdweb";
import { totalSupply } from "thirdweb/extensions/erc1155";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Chain Definitions
const sepoliaChain = defineChain(11155111);

// NFT Addresses from original Dashboard
const ETH_NFT_ADDRESS = "0x2B91E94Ce68cDf1321269c135Fbb12A2C1F781E5";
const SOL_NFT_ADDRESS = "BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS";

export default function ERPDashboard() {
    const [activeSection, setActiveSection] = useState('dashboard');
    const [villas, setVillas] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showListingModal, setShowListingModal] = useState(false);
    const [referralStats, setReferralStats] = useState<any>({
        totalEarned: 12.5,
        totalReferrals: 8,
        pendingPayout: 2.1,
        history: [
            { date: '2024-03-20', amount: 1.5, villa: 'Uluwatu Cliffside' },
            { date: '2024-03-22', amount: 2.8, villa: 'Seminyak Oasis' },
            { date: '2024-03-24', amount: 0.9, villa: 'Ubud Jungle' },
        ]
    });
    
    // Hydration guard
    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => {
        setHasMounted(true);
    }, []);

    // EVM Hooks
    const activeAccount = useActiveAccount();
    
    // Solana Hooks
    const { publicKey, connected: solanaConnected } = useWallet();

    // Read Real-time Sepolia Supply
    const { data: ethTotalSold } = useReadContract(
        totalSupply,
        {
          contract: getContract({ client, chain: sepoliaChain, address: ETH_NFT_ADDRESS }),
          id: BigInt(0),
        }
    );

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/villas');
            const data = await res.json();
            if (Array.isArray(data)) {
                // Filter to ONLY show the user's specific assets
                const filtered = data.filter(v => 
                    v.nftAddress === ETH_NFT_ADDRESS || 
                    v.nftAddress === SOL_NFT_ADDRESS
                );
                setVillas(filtered);
            }
            setIsLoading(false);
        } catch (err) {
            console.error('Fetch error:', err);
            setIsLoading(false);
        }
    };

    const renderDashboard = () => (
        <div className="section-content animate-fadeIn">
            <h2 className="section-title">Network Status & Key Metrics</h2>
            <div className="card-grid">
                <div className="info-card accent-blue">
                    <h4>Connected Identity</h4>
                    <p style={{ fontSize: '0.85em', color: activeAccount ? 'var(--spotify-green)' : 'var(--spotify-gray-lighter)' }}>
                        {activeAccount ? `Sepolia: ${activeAccount.address.slice(0,6)}...` : 'No EVM Wallet Connected'}
                    </p>
                    <p style={{ fontSize: '0.85em', color: solanaConnected ? 'var(--spotify-green)' : 'var(--spotify-gray-lighter)', marginTop: '5px' }}>
                        {solanaConnected ? `Solana: ${publicKey?.toString().slice(0,6)}...` : 'No Solana Wallet Connected'}
                    </p>
                    <User className="card-icon-bg" />
                </div>
                <div className="info-card accent-green">
                    <h4>Total Active Shares</h4>
                    <p className="stat-value">{Number(ethTotalSold || 0) + (villas.find(v => v.chain === 'solana')?.tokensSold || 0)}</p>
                    <Layers className="card-icon-bg" />
                </div>
                <div className="info-card accent-purple">
                    <h4>Total Tokenized Value</h4>
                    <p className="stat-value">$ {(villas.reduce((acc, v) => acc + (v.totalValue || 0), 0) / 1000).toFixed(1)}k</p>
                    <DollarSign className="card-icon-bg" />
                </div>
                <div className="info-card accent-orange">
                    <h4>Platform Health</h4>
                    <p className="stat-value">100%</p>
                    <ShieldCheck className="card-icon-bg" />
                </div>
            </div>

            <h3 className="section-subtitle">Managed Assets (Administrative Shortcuts)</h3>
            <div className="card-grid">
                {villas.map((villa, i) => (
                    <div key={villa.id} className="info-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ 
                            width: '50px', 
                            height: '50px', 
                            borderRadius: '4px', 
                            backgroundColor: villa.chain === 'ethereum' ? 'var(--accent-blue)' : 'var(--accent-teal)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: 'white'
                        }}>{villa.name[0]}</div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, color: 'white' }}>{villa.name}</h4>
                            <p style={{ margin: 0, fontSize: '0.7em' }}>{villa.chain === 'ethereum' ? 'Sepolia' : 'Solana Devnet'}</p>
                        </div>
                        <button className="btn-icon" onClick={() => setActiveSection('collections')}><Eye size={18} /></button>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderReferrals = () => (
        <div className="section-content animate-fadeIn">
            <h2 className="section-title">Referral Program Dashboard</h2>
            <div className="card-grid" style={{ marginBottom: '40px' }}>
                <div className="info-card accent-green">
                    <h4>Total Commissions</h4>
                    <p className="stat-value">{referralStats.totalEarned} SOL</p>
                    <div style={{ fontSize: '0.7em', color: 'var(--spotify-gray-lighter)' }}>~$ {(referralStats.totalEarned * 150).toFixed(2)} USD</div>
                    <DollarSign className="card-icon-bg" />
                </div>
                <div className="info-card accent-purple">
                    <h4>Active Referrals</h4>
                    <p className="stat-value">{referralStats.totalReferrals}</p>
                    <p style={{ margin: 0, fontSize: '0.7em' }}>Successful closures</p>
                    <User className="card-icon-bg" />
                </div>
                <div className="info-card accent-orange">
                    <h4>Available to Claim</h4>
                    <p className="stat-value">{referralStats.pendingPayout} SOL</p>
                    <button className="btn btn-primary" style={{ marginTop: '10px', fontSize: '0.7em', padding: '5px 10px' }}>Claim Now</button>
                    <Activity className="card-icon-bg" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                <div className="info-card" style={{ background: 'var(--spotify-gray-dark)' }}>
                    <h3 style={{ color: 'white', marginBottom: '20px' }}>Earnings Trend</h3>
                    {/* Placeholder for Chart */}
                    <div style={{ height: '200px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '10px', padding: '20px 0' }}>
                        {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                            <div key={i} style={{ flex: 1, background: 'var(--spotify-green)', height: `${h}%`, borderRadius: '4px 4px 0 0', opacity: 0.8 }}></div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--spotify-gray-lighter)', fontSize: '0.7em' }}>
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>

                <div className="info-card" style={{ background: 'var(--spotify-gray-dark)' }}>
                    <h3 style={{ color: 'white', marginBottom: '20px' }}>Recent Activity</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {referralStats.history.map((item: any, i: number) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', pb: '10px' }}>
                                <div>
                                    <div style={{ color: 'white', fontSize: '0.85em' }}>{item.villa}</div>
                                    <div style={{ fontSize: '0.7em', color: 'var(--spotify-gray-lighter)' }}>{item.date}</div>
                                </div>
                                <div style={{ color: 'var(--spotify-green)', fontWeight: 700 }}>+{item.amount} SOL</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCollections = () => (
        <div className="section-content animate-fadeIn">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="section-title">Asset Collection Registry</h2>
                <button className="btn btn-primary" onClick={() => setShowListingModal(true)}><Plus size={18} /> Add New RWA Asset</button>
            </div>
            
            <table className="spotify-table">
                <thead>
                    <tr>
                        <th>Asset Name</th>
                        <th>Network</th>
                        <th>Contract / Mint Address</th>
                        <th>Total Value</th>
                        <th>Supply Utilization</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {villas.map((villa) => {
                        const isEth = villa.chain === 'ethereum';
                        const realSupply = isEth ? Number(ethTotalSold || villa.tokensSold) : villa.tokensSold;
                        return (
                        <tr key={villa.id}>
                            <td style={{ color: 'white', fontWeight: 600 }}>{villa.name}</td>
                            <td>
                                <span className={`tag ${isEth ? 'tag-blue' : 'tag-green'}`}>
                                    {isEth ? 'Sepolia' : 'Solana'}
                                </span>
                            </td>
                            <td style={{ fontSize: '0.75em', fontFamily: 'monospace' }}>
                                {isEth ? ETH_NFT_ADDRESS.slice(0,12) + '...' : SOL_NFT_ADDRESS.slice(0,12) + '...'}
                                <Globe size={12} style={{ marginLeft: '8px', cursor: 'pointer' }} />
                            </td>
                            <td>$ {villa.totalValue?.toLocaleString()}</td>
                            <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '0.8em' }}>{realSupply} / 40000</span>
                                    <div style={{ width: '80px', height: '4px', background: 'var(--spotify-gray-medium)', borderRadius: '2px' }}>
                                        <div style={{ width: `${(realSupply / 40000) * 100}%`, height: '100%', background: 'var(--spotify-green)', borderRadius: '2px' }}></div>
                                    </div>
                                </div>
                            </td>
                            <td><span className="tag" style={{ background: 'rgba(29, 185, 84, 0.1)', color: 'var(--spotify-green)' }}>ACTIVE</span></td>
                            <td>
                                <button className="btn-icon"><Pencil size={16} /></button>
                                <button className="btn-icon" style={{ marginLeft: '10px' }}><Trash2 size={16} /></button>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    if (!hasMounted) return <div style={{ background: '#000', height: '100vh' }}></div>;

    return (
        <div className="spotify-erp-app">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <Activity className="logo-icon" />
                    <span>Makers ERP</span>
                </div>
                <nav className="main-nav">
                    <button className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSection('dashboard')}>
                        <Home className="nav-icon" /> <span>Dashboard</span>
                    </button>
                    <button className={`nav-item ${activeSection === 'collections' ? 'active' : ''}`} onClick={() => setActiveSection('collections')}>
                        <Layers className="nav-icon" /> <span>Registry</span>
                    </button>
                    <button className={`nav-item ${activeSection === 'minting' ? 'active' : ''}`} onClick={() => setActiveSection('minting')}>
                        <Activity className="nav-icon" /> <span>Operations</span>
                    </button>
                    <button className={`nav-item ${activeSection === 'analytics' ? 'active' : ''}`} onClick={() => setActiveSection('analytics')}>
                        <BarChart3 className="nav-icon" /> <span>Financials</span>
                    </button>
                    <button className={`nav-item ${activeSection === 'referrals' ? 'active' : ''}`} onClick={() => setActiveSection('referrals')}>
                        <Globe className="nav-icon" /> <span>Referral Hub</span>
                    </button>
                </nav>
                <div className="sidebar-separator"></div>
                <nav className="secondary-nav">
                    <button className="nav-item"><Settings className="nav-icon" /> <span>Settings</span></button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="main-view">
                <header className="top-bar">
                    <div className="navigation-buttons">
                        <button><ChevronLeft size={20} /></button>
                        <button><ChevronRight size={20} /></button>
                    </div>
                    
                    <div className="web3-connections" style={{ display: 'flex', gap: '15px' }}>
                        <ConnectButton client={client} theme="dark" connectButton={{ label: "EVM Admin" }} />
                        <WalletMultiButton />
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button className="btn btn-secondary" style={{ backgroundColor: 'transparent', border: '1px solid var(--spotify-gray-light)', color: 'white', fontSize: '11px' }}>
                            <Download size={12} /> Sync Ledger
                        </button>
                        <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--spotify-gray-medium)', color: 'white' }}>
                            <User size={18} />
                        </div>
                    </div>
                </header>

                <div className="content-area">
                    {activeSection === 'dashboard' && renderDashboard()}
                    {activeSection === 'collections' && renderCollections()}
                    {activeSection === 'referrals' && renderReferrals()}
                    {isLoading && <div style={{ color: 'var(--spotify-green)', textAlign: 'center', marginTop: '50px', fontWeight: 600 }}>Securing Connection to Database & Chain...</div>}
                </div>
            </main>

            {/* Modal Mockup for New Listing */}
            {showListingModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--spotify-gray-dark)', width: '500px', borderRadius: '12px', padding: '30px', border: '1px solid var(--spotify-gray-medium)' }}>
                        <h2 style={{ color: 'white', marginBottom: '20px' }}>List New RWA Asset</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input type="text" placeholder="Asset Name (e.g. Villa Uluwatu)" style={{ padding: '12px', background: 'var(--spotify-gray-medium)', border: 'none', borderRadius: '4px', color: 'white' }} />
                            <select style={{ padding: '12px', background: 'var(--spotify-gray-medium)', border: 'none', borderRadius: '4px', color: 'white' }}>
                                <option>Select Chain</option>
                                <option>Sepolia (Ethereum)</option>
                                <option>Solana Devnet</option>
                            </select>
                            <input type="text" placeholder="Contract / Mint Address" style={{ padding: '12px', background: 'var(--spotify-gray-medium)', border: 'none', borderRadius: '4px', color: 'white' }} />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowListingModal(false)}>Submit Listing</button>
                                <button className="btn" style={{ flex: 1, backgroundColor: 'var(--spotify-gray-medium)', color: 'white' }} onClick={() => setShowListingModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
