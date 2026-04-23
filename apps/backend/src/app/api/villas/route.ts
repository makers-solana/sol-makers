import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Connection, PublicKey } from '@solana/web3.js';


const SOLANA_RPC = "https://solana-rpc.publicnode.com";
const connection = new Connection(SOLANA_RPC);
const TREASURY_WALLET_ADDRESS = 'EdPsiCgZzq5QGwR8ttLhBzcg5WoNUUrZcPC9juGMJR9y'; // Deployer Hot Wallet that holds the NFTs

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://thehistorymaker.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// REAL_NFT_ADDRESSES removed for dynamic loading

async function fetchTokenSupply(mintAddress: string) {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const supplyInfo = await connection.getTokenSupply(mintPubkey);
    const totalSupply = supplyInfo.value.uiAmount || 0;

    try {
      const treasuryPubkey = new PublicKey(TREASURY_WALLET_ADDRESS);
      const tokenAccounts = await connection.getTokenAccountsByOwner(treasuryPubkey, { mint: mintPubkey });

      // If treasury has NO token account for this mint, no transfers have occurred yet —
      // treasury implicitly holds the full supply, so nothing has been sold.
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
}

export async function GET() {
  try {
    // Fetch all villas that have an NFT address defined dynamically
    const villas = await prisma.villa.findMany({
      where: {
        nftAddress: {
          not: "", // Ensure nftAddress is not empty
        }
      },
      include: {
        marketPrices: {
          orderBy: { recordedAt: 'desc' },
          take: 1
        },
        maintenanceLogs: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    // Transform data and fetch real-time supply
    const formattedVillas = await Promise.all(villas.map(async (v) => {
      const liveTokensSold = await fetchTokenSupply(v.nftAddress, v.tokensSold || 0);
      
      return {
        ...v,
        tokensSold: liveTokensSold,
        totalTokens: v.totalTokens,
        erp: {
          occupancy: v.occupancyStatus,
          nightlyRate: v.nightlyRate,
          apy: '0.0044%',
          totalTokens: v.totalTokens,
          tokensSold: liveTokensSold,
          nextPayout: '2024-04-10',
          maintenance: {
            last: v.lastMaintenance || '2024-03-15',
            next: v.nextMaintenance || '2024-06-15'
          },
          marketPrice: {
            secondary: v.marketPrices[0]?.price || v.pricePerShare,
            trend: '+5%'
          }
        }
      };
    }));

    return NextResponse.json(formattedVillas, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching villas:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const villa = await prisma.villa.create({
      data: {
        name: data.name,
        location: data.location,
        description: data.description || "",
        legalStructure: data.legalStructure || "FRACTIONAL_OWNERSHIP",
        totalShares: data.totalTokens || 100,
        pricePerShare: data.pricePerShare || 0,
        totalTokens: data.totalTokens || 0,
        tokensSold: data.tokensSold || 0,
        totalValue: (data.totalTokens || 0) * (data.pricePerShare || 0),
        bedrooms: data.bedrooms || 0,
        bathrooms: data.bathrooms || 0,
        sqm: data.sqm || 0,
        occupancyStatus: data.occupancyStatus || "VACANT",
        nightlyRate: data.nightlyRate || 0,
        ery: data.ery || 0,
        ary: data.ary || 0,
      }
    });
    return NextResponse.json(villa, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating villa:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500, headers: corsHeaders });
  }
}
