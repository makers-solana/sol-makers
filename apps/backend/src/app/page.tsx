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

// NFT Addresses from original Dashboard
const REAL_NFT_ADDRESSES = [
    "BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS",
    "d4Qqt3UzxcQBhqpRBZcQzknokCiGA82RRMzzwXBPYUg",
    "GABXPkqndQ7Fb7C2CST4pff1VkQXjcCtuvCdPpSRuQHy",
    "5uNBRRYNEux1GovaiRrgaGJAHRUBp8hXQqNMdkFgFVf8"
];

export default function ERPDashboard() {
    const [activeSection, setActiveSection] = useState('dashboard');
    const [villas, setVillas] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showListingModal, setShowListingModal] = useState(false);
    const [referralStats, setReferralStats] = useState<any>({
        totalEarned: 0,
        totalReferrals: 0,
        pendingPayout: 0,
        history: []
    });

    // Hydration guard
    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Solana Hooks
    const { publicKey, connected: solanaConnected } = useWallet();

    useEffect(() => {
        fetchData();
        if (publicKey) {
            fetchReferralStats(publicKey.toBase58());
        } else {
            setReferralStats({
                totalEarned: 0,
                totalReferrals: 0,
                pendingPayout: 0,
                history: []
            });
        }
    }, [publicKey]);

    const fetchReferralStats = async (address: string) => {
        try {
            const res = await fetch(`/api/referrals/${address}`);
            const data = await res.json();
            if (data && !data.error) {
                setReferralStats(data);
            }
        } catch (err) {
            console.error('Referral fetch error:', err);
        }
    };

    const fetchData = async () => {
        try {
            const res = await fetch('/api/villas');
            const data = await res.json();
            if (Array.isArray(data)) {
                setVillas(data);
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
                <div className="info-card glass glass-card accent-blue">
                    <h4>Connected Identity</h4>
                    <p style={{ fontSize: '0.85em', color: solanaConnected ? 'var(--spotify-green)' : 'var(--spotify-gray-lighter)', marginTop: '5px' }}>
                        {solanaConnected ? `Solana: ${publicKey?.toString().slice(0, 6)}...` : 'No Solana Wallet Connected'}
                    </p>
                    <User className="card-icon-bg" />
                </div>
                <div className="info-card glass glass-card accent-green">
                    <h4>Total Active Shares</h4>
                    <p className="stat-value">{villas.reduce((acc, v) => acc + (v.tokensSold || 0), 0).toLocaleString()}</p>
                    <Layers className="card-icon-bg" />
                </div>
                <div className="info-card glass glass-card accent-purple">
                    <h4>Total Tokenized Value</h4>
                    <p className="stat-value">$ {(villas.reduce((acc, v) => acc + (v.totalValue || 0), 0) / 1000).toFixed(1)}k</p>
                    <DollarSign className="card-icon-bg" />
                </div>
                <div className="info-card glass glass-card accent-orange">
                    <h4>Platform Health</h4>
                    <p className="stat-value">100%</p>
                    <ShieldCheck className="card-icon-bg" />
                </div>
            </div>

            <h3 className="section-subtitle">Managed Assets (Administrative Shortcuts)</h3>
            <div className="card-grid">
                {villas.map((villa, i) => (
                    <div key={villa.id} className="info-card glass glass-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--accent-teal)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: 'white'
                        }}>{villa.name[0]}</div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, color: 'white' }}>{villa.name}</h4>
                            <p style={{ margin: 0, fontSize: '0.7em' }}>Solana Devnet</p>
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
            {!publicKey ? (
                <div style={{ padding: '60px', textAlign: 'center', background: 'var(--spotify-gray-dark)', borderRadius: '12px', border: '1px dotted var(--spotify-gray-light)' }}>
                    <Globe size={48} color="var(--spotify-gray-light)" style={{ marginBottom: '20px' }} />
                    <h3 style={{ color: 'white' }}>Wallet Not Connected</h3>
                    <p style={{ color: 'var(--spotify-gray-lighter)', marginBottom: '20px' }}>Connect your Solana wallet to view your personalized referral statistics and earnings.</p>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <WalletMultiButton />
                    </div>
                </div>
            ) : (
                <>
                    <div className="card-grid" style={{ marginBottom: '40px' }}>
                        <div className="info-card glass glass-card accent-green">
                            <h4>Total Commissions</h4>
                            <p className="stat-value">{referralStats.totalEarned} SOL</p>
                            <div style={{ fontSize: '0.7em', color: 'var(--spotify-gray-lighter)' }}>~$ {(referralStats.totalEarned * 150).toFixed(2)} USD</div>
                            <DollarSign className="card-icon-bg" />
                        </div>
                        <div className="info-card glass glass-card accent-purple">
                            <h4>Active Referrals</h4>
                            <p className="stat-value">{referralStats.totalReferrals}</p>
                            <p style={{ margin: 0, fontSize: '0.7em' }}>Successful closures</p>
                            <User className="card-icon-bg" />
                        </div>
                        <div className="info-card glass glass-card accent-orange">
                            <h4>Estimated Earnings</h4>
                            <p className="stat-value">{referralStats.totalEarned} SOL</p>
                            <p style={{ margin: 0, fontSize: '0.7em', color: 'var(--spotify-gray-lighter)' }}>Auto-Distributed (10%)</p>
                            <Activity className="card-icon-bg" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                        <div className="info-card glass glass-card">
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

                        <div className="info-card glass glass-card">
                            <h3 style={{ color: 'white', marginBottom: '20px' }}>Recent Activity</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {referralStats.history.map((item: any, i: number) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
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
                </>
            )}
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
                        const realSupply = villa.tokensSold;
                        return (
                            <tr key={villa.id}>
                                <td style={{ color: 'white', fontWeight: 600 }}>{villa.name}</td>
                                <td>
                                    <span className="tag tag-green">
                                        Solana
                                    </span>
                                </td>
                                <td style={{ fontSize: '0.75em', fontFamily: 'monospace' }}>
                                    {villa.nftAddress.slice(0, 12)}...
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
        <div className="spotify-erp-app glass-theme-wrapper" style={{ paddingTop: '80px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '6px', cursor: 'pointer' }} onClick={() => window.location.href = 'http://localhost:3000/'}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #fff, #7c5cff)', boxShadow: '0 0 0 6px rgba(124, 92, 255, 0.12)' }}></div>
                    <span style={{ fontWeight: 800, letterSpacing: '0.02em', color: 'var(--spotify-white)' }}>Makers</span>
                    <span style={{ marginLeft: '8px', padding: '6px 10px', borderRadius: '999px', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.04)', color: 'var(--spotify-gray-lighter)', fontSize: '12px' }}>Asset & Earning</span>
                </div>

                <nav className="glass-nav" aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <a href="http://localhost:3000/" className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>Home</a>
                    <a href="http://localhost:3000/marketplace" className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>Marketplace</a>
                    <a href="#" className="glass-btn glass-btn--primary glass-btn--sm" style={{ padding: '9px 12px' }}>Asset & Earning</a>
                    <a href="http://localhost:3000/about" className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>About Us</a>
                </nav>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <WalletMultiButton />
                </div>
            </nav>

            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <Activity className="logo-icon" />
                    <span>Makers</span>
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
                <div className="content-area" style={{ paddingTop: '20px' }}>
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
