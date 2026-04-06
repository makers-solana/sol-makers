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
    Settings,
    Menu,
    X,
    CloudLightning
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Operations (Deploy NFT) state
    const [deployNetwork, setDeployNetwork] = useState<'devnet' | 'mainnet'>('devnet');
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployLog, setDeployLog] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [deployForm, setDeployForm] = useState<any>({
        name: '',
        symbol: '',
        description: '',
        supply: 40000,
        pricePerShare: 100,
        totalValue: 4000000,
        attributes: [
            { trait_type: 'Location', value: 'Uluwatu, Bali' },
            { trait_type: 'Bedrooms', value: '3' },
            { trait_type: 'Bathrooms', value: '3' },
            { trait_type: 'Land Size', value: '150 m²' },
            { trait_type: 'Total Fractions', value: '40000' },
            { trait_type: 'Asset Type', value: 'Villa' },
        ],
    });

    const handleDeploy = async () => {
        if (!publicKey) return;
        if (!selectedFile) {
            setDeployLog([`[${new Date().toLocaleTimeString()}] Error: Please select an image or video file first.`]);
            return;
        }
        setIsDeploying(true);
        setDeployLog([`[${new Date().toLocaleTimeString()}] Starting deployment to ${deployNetwork}...`]);

        try {
            const formData = new FormData();
            formData.append('callerAddress', publicKey.toBase58());
            formData.append('network', deployNetwork);
            formData.append('name', deployForm.name);
            formData.append('symbol', deployForm.symbol);
            formData.append('description', deployForm.description);
            formData.append('supply', deployForm.supply.toString());
            formData.append('pricePerShare', deployForm.pricePerShare.toString());
            formData.append('totalValue', deployForm.totalValue.toString());
            formData.append('attributes', JSON.stringify(deployForm.attributes.filter((a: any) => a.trait_type && a.value)));
            formData.append('file', selectedFile);

            setDeployLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Uploading asset & metadata to Irys (Arweave)...`]);

            const response = await fetch('/api/solana/deploy-nft', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Deployment failed');
            }

            setDeployLog(prev => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] ✓ Asset stored: ${data.assetUri.slice(0, 30)}...`,
                `[${new Date().toLocaleTimeString()}] ✓ Metadata stored: ${data.metadataUri.slice(0, 30)}...`,
                `[${new Date().toLocaleTimeString()}] ✓ ${data.message}`,
                `[${new Date().toLocaleTimeString()}] ✓ Mint Address: ${data.mintAddress}`,
                `[${new Date().toLocaleTimeString()}] ✓ Network: ${data.network} | Supply: ${data.supply}`,
            ]);

            // Refresh villa list
            fetchData();
        } catch (error: any) {
            setDeployLog(prev => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] Error: ${error.message}`,
            ]);
        } finally {
            setIsDeploying(false);
        }
    };

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
        if (hasMounted) {
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
        }
    }, [publicKey, hasMounted]);

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

    const handleDeleteVilla = async (id: string) => {
        const confirmDelete = window.confirm('Are you sure you want to remove this asset? It will be deleted from the marketplace permanently.');
        if (!confirmDelete) return;

        try {
            const res = await fetch(`/api/villas/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                alert('Asset successfully removed from the registry.');
                fetchData(); // Refresh the list
            } else {
                alert('Error deleting asset: ' + data.error);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete asset. Check console for details.');
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
                                    <button className="btn-icon" style={{ marginLeft: '10px' }} onClick={() => handleDeleteVilla(villa.id)}><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderOperations = () => {
        const DEPLOYER_ADDRESSES = [
            '5xKeGY3yZnMV3cz8MLqc9sjrbjH12yLbynB59aMpSvKz', // Treasury — receives payments & deploys
            'EUWDRpaq8yc5X7paoA7GMfLieL8qUfB3MTm744v7kTim', // Deployer — deploy only
            '8bw4qgyQnChaa91hxUViB8gMLjmC39UvFsPMydwRmUN8', // Devnet
        ];

        const isDeployer = publicKey && DEPLOYER_ADDRESSES.includes(publicKey.toBase58());

        if (!solanaConnected || !isDeployer) {
            return (
                <div className="section-content animate-fadeIn">
                    <h2 className="section-title">Operations — NFT Deployment</h2>
                    <div style={{
                        padding: '80px 40px',
                        textAlign: 'center',
                        background: 'linear-gradient(145deg, rgba(255,59,48,0.05) 0%, rgba(255,149,0,0.03) 100%)',
                        borderRadius: '16px',
                        border: '1px dashed rgba(255, 59, 48, 0.3)',
                    }}>
                        <ShieldCheck size={56} color="#ff3b30" style={{ marginBottom: '20px', opacity: 0.7 }} />
                        <h3 style={{ color: '#ff3b30', marginBottom: '12px', fontSize: '1.3rem' }}>Access Restricted</h3>
                        <p style={{ color: 'var(--spotify-gray-lighter)', maxWidth: '500px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
                            This section is exclusively available to the <strong style={{ color: 'white' }}>Authorized Deployer Wallet</strong>.<br/>
                            Please connect the authorized wallet to access NFT deployment operations.
                        </p>
                        {!solanaConnected ? (
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '15px'
                            }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--spotify-gray-lighter)' }}>
                                    Connection rule: Authorize your session to continue.
                                </p>
                                <WalletMultiButton />
                            </div>
                        ) : null}
                        {solanaConnected && !isDeployer && (
                            <p style={{ fontSize: '0.8rem', color: '#ff3b30', marginTop: '12px' }}>
                                Connected: {publicKey?.toBase58().slice(0, 8)}... — Not an authorized deployer.
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="section-content animate-fadeIn">
                <h2 className="section-title">Operations — Deploy New NFT / SFT</h2>
                <p style={{ color: 'var(--spotify-gray-lighter)', marginBottom: '30px', fontSize: '0.9rem' }}>
                    Deploy a new Semi-Fungible Token (SFT) on the Solana blockchain. Fill in the metadata below.
                </p>

                {/* Network Selector */}
                <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--spotify-gray-lighter)', letterSpacing: '0.1em', marginBottom: '10px' }}>NETWORK</label>
                    <div style={{ display: 'flex', backgroundColor: 'var(--spotify-gray-dark)', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
                        <button
                            onClick={() => setDeployNetwork('devnet')}
                            style={{
                                padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                background: deployNetwork === 'devnet' ? 'linear-gradient(90deg, #9945FF, #14F195)' : 'transparent',
                                color: deployNetwork === 'devnet' ? 'white' : 'var(--spotify-gray-lighter)',
                                transition: 'all 0.3s',
                            }}
                        >DEVNET</button>
                        <button
                            onClick={() => setDeployNetwork('mainnet')}
                            style={{
                                padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                background: deployNetwork === 'mainnet' ? 'linear-gradient(90deg, #14F195, #9945FF)' : 'transparent',
                                color: deployNetwork === 'mainnet' ? 'white' : 'var(--spotify-gray-lighter)',
                                transition: 'all 0.3s',
                            }}
                        >MAINNET</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    {/* Left Column — Core Metadata */}
                    <div className="info-card glass glass-card" style={{ padding: '30px' }}>
                        <h3 style={{ color: 'white', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Database size={20} color="var(--spotify-green)" /> Token Metadata
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <label style={labelStyle}>NAME *</label>
                                <input type="text" placeholder='e.g. Uluwatu Villa #5' value={deployForm.name}
                                    onChange={e => setDeployForm({ ...deployForm, name: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>SYMBOL *</label>
                                <input type="text" placeholder='e.g. GNVLT' value={deployForm.symbol}
                                    onChange={e => setDeployForm({ ...deployForm, symbol: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>DESCRIPTION</label>
                                <textarea placeholder='Luxury villa located in Uluwatu, Bali...' value={deployForm.description}
                                    onChange={e => setDeployForm({ ...deployForm, description: e.target.value })}
                                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>UPLOAD ASSET (IMAGE/VIDEO) *</label>
                                <div style={{ 
                                    border: '2px dashed rgba(255,255,255,0.1)', 
                                    borderRadius: '12px', 
                                    padding: '20px', 
                                    textAlign: 'center',
                                    background: 'rgba(255,255,255,0.02)',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}>
                                    <input 
                                        type="file" 
                                        accept="image/png, image/jpeg, image/gif, video/mp4"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 10 * 1024 * 1024) {
                                                    alert("File size exceeds 10MB limit.");
                                                    return;
                                                }
                                                setSelectedFile(file);
                                                const url = URL.createObjectURL(file);
                                                setFilePreview(url);
                                            }
                                        }}
                                        style={{ 
                                            position: 'absolute', 
                                            inset: 0, 
                                            opacity: 0, 
                                            cursor: 'pointer',
                                            width: '100%',
                                            height: '100%'
                                        }} 
                                    />
                                    {!filePreview ? (
                                        <div style={{ color: 'var(--spotify-gray-lighter)', fontSize: '0.85rem' }}>
                                            <Download size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                            <div>Click or drag to upload</div>
                                            <div style={{ fontSize: '0.7rem', marginTop: '4px' }}>PNG, JPG, GIF, MP4 (Max 10MB)</div>
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            {selectedFile?.type.startsWith('video') ? (
                                                <video src={filePreview} controls style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '150px' }} />
                                            ) : (
                                                <img src={filePreview} style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '150px', objectFit: 'contain' }} />
                                            )}
                                            <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--spotify-green)' }}>
                                                {selectedFile?.name} ({(selectedFile?.size! / 1024 / 1024).toFixed(2)} MB)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={labelStyle}>TOTAL SUPPLY (FRACTIONS) *</label>
                                    <input type="number" value={deployForm.supply}
                                        onChange={e => setDeployForm({ ...deployForm, supply: parseInt(e.target.value) })} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>PRICE PER SHARE (USDC/SOL) *</label>
                                    <input type="number" value={deployForm.pricePerShare}
                                        onChange={e => setDeployForm({ ...deployForm, pricePerShare: parseFloat(e.target.value) })} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>TOTAL VALUE (USD) *</label>
                                    <input type="number" value={deployForm.totalValue}
                                        onChange={e => setDeployForm({ ...deployForm, totalValue: parseFloat(e.target.value) })} style={inputStyle} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column — Attributes */}
                    <div className="info-card glass glass-card" style={{ padding: '30px' }}>
                        <h3 style={{ color: 'white', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Layers size={20} color="#9945FF" /> Attributes (Properties)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {deployForm.attributes.map((attr: any, i: number) => (
                                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="text" placeholder='Trait Type' value={attr.trait_type}
                                        onChange={e => {
                                            const newAttrs = [...deployForm.attributes];
                                            newAttrs[i] = { ...newAttrs[i], trait_type: e.target.value };
                                            setDeployForm({ ...deployForm, attributes: newAttrs });
                                        }} style={{ ...inputStyle, flex: 1 }} />
                                    <input type="text" placeholder='Value' value={attr.value}
                                        onChange={e => {
                                            const newAttrs = [...deployForm.attributes];
                                            newAttrs[i] = { ...newAttrs[i], value: e.target.value };
                                            setDeployForm({ ...deployForm, attributes: newAttrs });
                                        }} style={{ ...inputStyle, flex: 1 }} />
                                    <button onClick={() => {
                                        const newAttrs = deployForm.attributes.filter((_: any, idx: number) => idx !== i);
                                        setDeployForm({ ...deployForm, attributes: newAttrs });
                                    }} style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', color: '#ff3b30', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => {
                                setDeployForm({
                                    ...deployForm,
                                    attributes: [...deployForm.attributes, { trait_type: '', value: '' }]
                                });
                            }} style={{
                                background: 'rgba(153, 69, 255, 0.1)', border: '1px dashed rgba(153, 69, 255, 0.4)',
                                color: '#9945FF', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}>
                                <Plus size={16} /> Add Attribute
                            </button>
                        </div>

                        {/* JSON Preview */}
                        <div style={{ marginTop: '24px' }}>
                            <label style={labelStyle}>JSON PREVIEW</label>
                            <pre style={{
                                background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '10px',
                                fontSize: '0.7rem', color: '#14F195', overflow: 'auto', maxHeight: '200px',
                                border: '1px solid rgba(20, 241, 149, 0.1)',
                            }}>
                                {JSON.stringify({
                                    name: deployForm.name, symbol: deployForm.symbol,
                                    description: deployForm.description, image: deployForm.image,
                                    external_url: 'https://thehistorymaker.io',
                                    attributes: deployForm.attributes.filter((a: any) => a.trait_type),
                                    properties: {
                                        files: deployForm.image ? [{ uri: deployForm.image, type: 'image/png' }] : [],
                                        category: 'image'
                                    }
                                }, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Deploy Button & Log */}
                <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <button
                        onClick={handleDeploy}
                        disabled={isDeploying}
                        style={{
                            width: '100%', padding: '18px', borderRadius: '14px', border: 'none', fontWeight: 900, fontSize: '1rem', cursor: isDeploying ? 'not-allowed' : 'pointer',
                            background: isDeploying ? 'var(--spotify-gray-medium)' : 'linear-gradient(90deg, #9945FF, #14F195)',
                            color: 'white', transition: 'all 0.3s',
                            boxShadow: isDeploying ? 'none' : '0 4px 20px rgba(153, 69, 255, 0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        }}
                    >
                        {isDeploying ? (
                            <><Activity size={20} className="spin" /> Deploying to {deployNetwork}...</>
                        ) : (
                            <><CloudLightning size={20} /> Deploy NFT to {deployNetwork.toUpperCase()}</>
                        )}
                    </button>

                    {deployLog.length > 0 && (
                        <div style={{
                            background: 'rgba(0,0,0,0.5)', borderRadius: '12px', padding: '20px',
                            border: '1px solid var(--spotify-gray-medium)', maxHeight: '300px', overflow: 'auto',
                        }}>
                            <h4 style={{ color: 'var(--spotify-green)', marginBottom: '12px', fontSize: '0.8rem', fontWeight: 800 }}>DEPLOYMENT LOG</h4>
                            {deployLog.map((log: string, i: number) => (
                                <div key={i} style={{
                                    padding: '6px 0', fontSize: '0.8rem', fontFamily: 'monospace',
                                    color: log.includes('Error') || log.includes('error') ? '#ff3b30' :
                                           log.includes('Success') || log.includes('✓') ? '#14F195' : 'var(--spotify-gray-lighter)',
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                }}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '0.7rem', fontWeight: 800,
        color: 'var(--spotify-gray-lighter)', letterSpacing: '0.08em', marginBottom: '6px',
    };
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 14px', background: 'var(--spotify-gray-medium)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'white',
        fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s',
    };


    if (!hasMounted) return <div style={{ background: '#000', height: '100vh' }}></div>;

    return (
        <div className="spotify-erp-app glass-theme-wrapper" style={{ paddingTop: '80px' }}>
            <div className="scene" aria-hidden="true">
                <div className="scene__blob scene__blob--1"></div>
                <div className="scene__blob scene__blob--2"></div>
                <div className="scene__blob scene__blob--3"></div>
            </div>

            <nav className="glass glass-header" style={{
                position: 'fixed',
                inset: '14px 14px auto 14px',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '999px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '6px', cursor: 'pointer' }} onClick={() => window.location.href = 'https://thehistorymaker.io/'}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #fff, #7c5cff)', boxShadow: '0 0 0 6px rgba(124, 92, 255, 0.12)' }}></div>
                    <span style={{ fontWeight: 800, letterSpacing: '0.02em', color: 'var(--spotify-white)' }}>Makers</span>
                    <span style={{ marginLeft: '8px', padding: '6px 10px', borderRadius: '999px', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.04)', color: 'var(--spotify-gray-lighter)', fontSize: '12px' }}>Asset & Earning</span>
                </div>

                <nav className="glass-nav header-nav-desktop" aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <a href="https://thehistorymaker.io/" className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>Home</a>
                    <a href="https://thehistorymaker.io/marketplace" className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>Marketplace</a>
                    <a href="#" className="glass-btn glass-btn--primary glass-btn--sm" style={{ padding: '9px 12px' }}>Asset & Earning</a>
                    <a href="https://docs.thehistorymaker.io/" target="_blank" rel="noopener noreferrer" className="glass-btn glass-btn--ghost glass-btn--sm" style={{ padding: '9px 12px' }}>About Us</a>
                </nav>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="header-nav-desktop">
                        <WalletMultiButton />
                    </div>
                    {/* Mobile Hamburger Toggle */}
                    <button 
                        className="mobile-menu-toggle"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        style={{ 
                            display: 'none', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            border: '1px solid rgba(255, 255, 255, 0.2)', 
                            color: 'white',
                            padding: '8px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            zIndex: 1001
                        }}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Drawer */}
            <div className={`mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`} style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '280px',
                height: '100vh',
                backgroundColor: '#05070e',
                zIndex: 2000,
                padding: '80px 24px 24px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '30px',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                transition: 'transform 0.3s ease-in-out',
                transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.1em' }}>NAVIGATION</span>
                    <a href="https://thehistorymaker.io/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700 }}>Home</a>
                    <a href="https://thehistorymaker.io/marketplace" style={{ color: 'white', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700 }}>Marketplace</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }} style={{ color: 'var(--spotify-green)', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700 }}>Asset & Earning</a>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.1em' }}>ERP SECTIONS</span>
                    <button className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveSection('dashboard'); setIsMobileMenuOpen(false); }} style={{ color: 'white', textAlign: 'left', background: 'none', border: 'none', fontSize: '1.1rem', padding: '10px 0', cursor: 'pointer' }}>Dashboard</button>
                    <button className={`nav-item ${activeSection === 'collections' ? 'active' : ''}`} onClick={() => { setActiveSection('collections'); setIsMobileMenuOpen(false); }} style={{ color: 'white', textAlign: 'left', background: 'none', border: 'none', fontSize: '1.1rem', padding: '10px 0', cursor: 'pointer' }}>Registry</button>
                    <button className={`nav-item ${activeSection === 'referrals' ? 'active' : ''}`} onClick={() => { setActiveSection('referrals'); setIsMobileMenuOpen(false); }} style={{ color: 'white', textAlign: 'left', background: 'none', border: 'none', fontSize: '1.1rem', padding: '10px 0', cursor: 'pointer' }}>Referral Hub</button>
                </div>

                <div style={{ marginTop: 'auto' }}>
                    <WalletMultiButton />
                </div>
            </div>

            {/* Overlay for Mobile Menu */}
            {isMobileMenuOpen && (
                <div 
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1500 }}
                />
            )}

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
                    {activeSection === 'minting' && renderOperations()}
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
