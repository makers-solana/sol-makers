import { NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
import bs58 from 'bs58';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://thehistorymaker.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buyerAddress, mintAddress, amountTokens, totalLamports, referralAddress, referralLamports, network } = body;

    if (!buyerAddress || !mintAddress || !amountTokens || !totalLamports || !network) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400, headers: corsHeaders });
    }

    let actualReferralAddress = referralAddress;
    
    // If referralAddress is a short code (6 characters), look it up
    if (referralAddress && referralAddress.length === 6) {
      const user = await prisma.user.findUnique({
        where: { referralCode: referralAddress },
      });
      if (user && user.address) {
        actualReferralAddress = user.address;
      } else {
        console.warn(`Referral code ${referralAddress} not found in DB`);
        actualReferralAddress = null; // invalid code, ignore referral
      }
    }

    const finalReferralLamports = actualReferralAddress ? referralLamports : 0;

    const isMainnet = network === 'mainnet';
    
    // Choose connection based on network
    const connectionUrl = isMainnet 
      ? 'https://solana-rpc.publicnode.com'
      : 'https://rpc.ankr.com/solana_devnet';
    
    const connection = new Connection(connectionUrl, 'confirmed');

    // Load matching private key
    // We expect process.env variables to be loaded safely
    const privateKeyString = isMainnet ? process.env.MAINNET_PRIVATE_KEY : process.env.DEVNET_PRIVATE_KEY;
    if (!privateKeyString) {
      console.error(`Missing ${isMainnet ? 'MAINNET_PRIVATE_KEY' : 'DEVNET_PRIVATE_KEY'} in .env`);
      return NextResponse.json({ error: 'Treasury private key not configured securely on server' }, { status: 500, headers: corsHeaders });
    }

    let treasuryKeypair: Keypair;
    try {
      if (privateKeyString.startsWith('[')) {
        const secretKey = Uint8Array.from(JSON.parse(privateKeyString));
        treasuryKeypair = Keypair.fromSecretKey(secretKey);
      } else {
        treasuryKeypair = Keypair.fromSecretKey(bs58.decode(privateKeyString));
      }
    } catch (e) {
      console.error('Failed to parse treasury private key:', e);
      return NextResponse.json({ error: 'Invalid treasury key format in server config' }, { status: 500, headers: corsHeaders });
    }



    // Always use the keypair's public key as the true treasury destination
    const treasuryPubkey = treasuryKeypair.publicKey;
    const buyerPubkey = new PublicKey(buyerAddress);
    const mintPubkey = new PublicKey(mintAddress);
    const transaction = new Transaction();

    // 1. Add SOL Transfers (Buyer -> Treasury & Referral)
    let finalSellerLamports = totalLamports;
    if (actualReferralAddress && finalReferralLamports && finalReferralLamports > 0) {
      try {
        const referralPubkey = new PublicKey(actualReferralAddress);
        finalSellerLamports = totalLamports - finalReferralLamports;
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: buyerPubkey,
            toPubkey: treasuryPubkey,
            lamports: finalSellerLamports,
          }),
          SystemProgram.transfer({
            fromPubkey: buyerPubkey,
            toPubkey: referralPubkey,
            lamports: finalReferralLamports,
          })
        );
      } catch (e) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: buyerPubkey,
            toPubkey: treasuryPubkey,
            lamports: totalLamports,
          })
        );
      }
    } else {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: buyerPubkey,
          toPubkey: treasuryPubkey,
          lamports: totalLamports,
        })
      );
    }

    // 2. Add SPL Token Transfer (Treasury -> Buyer)
    const treasuryATA = await getAssociatedTokenAddress(mintPubkey, treasuryPubkey);
    const buyerATA = await getAssociatedTokenAddress(mintPubkey, buyerPubkey);

    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        buyerPubkey, // payer
        buyerATA,    // ata
        buyerPubkey, // owner
        mintPubkey   // mint
      )
    );

    // Transfer fractional asset assuming 0 decimals for our SFTs
    transaction.add(
      createTransferInstruction(
        treasuryATA, // source
        buyerATA,    // destination
        treasuryPubkey, // owner of source (treasury)
        amountTokens, // amount
      )
    );

    // 3. Set Blockhash and Fee Payer
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = buyerPubkey;

    // 4. Parital Sign by Treasury
    transaction.partialSign(treasuryKeypair);

    // Serialize to Base64 (requireAllSignatures MUST be false since buyer hasn't signed yet)
    const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
    const base64Tx = serializedTransaction.toString('base64');

    return NextResponse.json({ transaction: base64Tx }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Error building transaction:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
