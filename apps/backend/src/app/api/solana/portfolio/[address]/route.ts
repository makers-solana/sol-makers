import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { prisma } from '@/lib/prisma';

const SOLANA_RPC = 'https://solana-rpc.publicnode.com';
const connection = new Connection(SOLANA_RPC);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  req: Request,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400, headers: corsHeaders });
    }

    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(address);
    } catch {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400, headers: corsHeaders });
    }

    // Get all villas from database
    const villas = await prisma.villa.findMany({
      where: {
        nftAddress: { not: '' }
      }
    });

    const portfolio: any[] = [];

    for (const villa of villas) {
      try {
        const mintPubkey = new PublicKey(villa.nftAddress);
        const tokenAccounts = await connection.getTokenAccountsByOwner(walletPubkey, { mint: mintPubkey });

        if (tokenAccounts.value.length > 0) {
          const balanceRecord = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
          const balance = balanceRecord.value.uiAmount || 0;

          if (balance > 0) {
            portfolio.push({
              villaId: villa.id,
              name: villa.name,
              location: villa.location,
              nftAddress: villa.nftAddress,
              images: villa.images,
              balance: balance,
              totalTokens: villa.totalTokens || 40000,
              pricePerShare: villa.pricePerShare || 100,
              totalValue: villa.totalValue || 0,
              ownershipPercent: ((balance / (villa.totalTokens || 40000)) * 100),
              estimatedValueUsd: balance * (villa.pricePerShare || 100),
            });
          }
        }
      } catch (err) {
        console.warn(`[Portfolio] Could not check balance for ${villa.nftAddress}:`, err);
        // Continue to the next villa
      }
    }

    return NextResponse.json({
      wallet: address,
      totalAssets: portfolio.length,
      totalEstimatedValueUsd: portfolio.reduce((sum, p) => sum + p.estimatedValueUsd, 0),
      holdings: portfolio,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('[Portfolio] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
