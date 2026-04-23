import { NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
import bs58 from 'bs58';
import { prisma } from '@/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://thehistorymaker.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export const dynamic = 'force-dynamic';

const MAX_TOKENS_PER_TX = 100;
const REFERRAL_PERCENT = 10;
// Acceptable price slippage: ±20% tolerance (protects against rapid SOL price moves)
const PRICE_TOLERANCE = 0.20;

async function getSolPriceUsd(): Promise<number> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
      next: { revalidate: 60 },
    });
    const data = await res.json();
    return data?.solana?.usd ?? 150;
  } catch {
    console.warn('[build-tx] Failed to fetch SOL price, using fallback $150');
    return 150;
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buyerAddress, mintAddress, amountTokens, totalLamports, referralAddress, network } = body;

    // ── 1. Validate required fields ────────────────────────────────────────
    if (!buyerAddress || !mintAddress || !amountTokens || !network) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400, headers: corsHeaders });
    }

    // Validate network value
    if (!['mainnet', 'devnet'].includes(network)) {
      return NextResponse.json({ error: 'Invalid network. Must be mainnet or devnet.' }, { status: 400, headers: corsHeaders });
    }

    // Validate amountTokens bounds
    const parsedAmount = parseInt(amountTokens);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0 || parsedAmount > MAX_TOKENS_PER_TX) {
      return NextResponse.json(
        { error: `Invalid token amount. Must be between 1 and ${MAX_TOKENS_PER_TX}.` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate mintAddress is a valid Solana PublicKey
    let mintPubkey: PublicKey;
    try {
      mintPubkey = new PublicKey(mintAddress);
    } catch {
      return NextResponse.json({ error: 'Invalid mintAddress.' }, { status: 400, headers: corsHeaders });
    }

    // Validate buyerAddress
    let buyerPubkey: PublicKey;
    try {
      buyerPubkey = new PublicKey(buyerAddress);
    } catch {
      return NextResponse.json({ error: 'Invalid buyerAddress.' }, { status: 400, headers: corsHeaders });
    }

    // ── 2. Fetch Villa price from database ────────────────────────────────
    const villa = await prisma.villa.findUnique({
      where: { nftAddress: mintAddress },
      select: { pricePerShare: true, availableShares: true },
    });

    if (!villa) {
      return NextResponse.json({ error: 'Villa not found for given mintAddress.' }, { status: 404, headers: corsHeaders });
    }

    if (villa.availableShares < parsedAmount) {
      return NextResponse.json({ error: 'Not enough shares available.' }, { status: 400, headers: corsHeaders });
    }

    // ── 3. Calculate server-side price ────────────────────────────────────
    const solPriceUsd = await getSolPriceUsd();
    const pricePerShareSol = villa.pricePerShare / solPriceUsd;
    const expectedLamports = Math.floor(parsedAmount * pricePerShareSol * 1e9);

    // Validate the client-supplied totalLamports is within ±20% tolerance
    if (totalLamports !== undefined) {
      const parsedClientLamports = parseInt(totalLamports);
      const lowerBound = Math.floor(expectedLamports * (1 - PRICE_TOLERANCE));
      const upperBound = Math.ceil(expectedLamports * (1 + PRICE_TOLERANCE));
      if (parsedClientLamports < lowerBound) {
        console.warn(`[build-tx] Price manipulation attempt. Expected ~${expectedLamports}, got ${parsedClientLamports}`);
        return NextResponse.json({ error: 'Insufficient payment amount.' }, { status: 400, headers: corsHeaders });
      }
    }

    // Always use server-computed lamports
    const finalTotalLamports = expectedLamports;

    // ── 4. Calculate referral commission on server ────────────────────────
    let actualReferralAddress: string | null = null;
    if (referralAddress) {
      if (referralAddress.length === 6) {
        // Short code lookup
        const user = await prisma.user.findUnique({ where: { referralCode: referralAddress } });
        if (user?.address) {
          actualReferralAddress = user.address;
        } else {
          console.warn(`[build-tx] Referral code '${referralAddress}' not found in DB — skipping referral.`);
        }
      } else {
        // Full wallet address
        try {
          new PublicKey(referralAddress); // validate
          actualReferralAddress = referralAddress;
        } catch {
          console.warn(`[build-tx] Invalid referral wallet address '${referralAddress}' — skipping referral.`);
        }
      }
    }

    const serverReferralLamports = actualReferralAddress
      ? Math.floor(finalTotalLamports * REFERRAL_PERCENT / 100)
      : 0;
    const vaultLamports = finalTotalLamports - serverReferralLamports;

    // Safety check: vault must always receive the majority
    if (vaultLamports <= 0 || serverReferralLamports >= finalTotalLamports) {
      return NextResponse.json({ error: 'Invalid referral lamport calculation.' }, { status: 400, headers: corsHeaders });
    }

    // ── 5. Setup Connection & Keypair ─────────────────────────────────────
    const isMainnet = network === 'mainnet';
    const connectionUrl = isMainnet
      ? (process.env.MAINNET_RPC_URL || 'https://solana-rpc.publicnode.com')
      : 'https://api.devnet.solana.com';
    const connection = new Connection(connectionUrl, 'confirmed');

    const privateKeyString = isMainnet ? process.env.MAINNET_PRIVATE_KEY : process.env.DEVNET_PRIVATE_KEY;
    if (!privateKeyString) {
      console.error(`[build-tx] Missing ${isMainnet ? 'MAINNET_PRIVATE_KEY' : 'DEVNET_PRIVATE_KEY'} in .env`);
      return NextResponse.json({ error: 'Treasury private key not configured on server.' }, { status: 500, headers: corsHeaders });
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
      console.error('[build-tx] Failed to parse treasury private key:', e);
      return NextResponse.json({ error: 'Invalid treasury key format in server config.' }, { status: 500, headers: corsHeaders });
    }

    const treasuryPubkey = treasuryKeypair.publicKey;
    const vaultPubkey = new PublicKey('3qvjpDu3wkvR11aAQAUTB3zxeyTyTUUDAT6wJXAK92hL');

    console.log(`[build-tx] Buyer: ${buyerAddress}, Mint: ${mintAddress}, Tokens: ${parsedAmount}, Total: ${finalTotalLamports} lamports, Referral: ${serverReferralLamports} lamports`);

    // ── 6. Build Transaction ──────────────────────────────────────────────
    const transaction = new Transaction();

    // SOL Transfers: Buyer → Vault (90%) & Referrer (10%)
    if (actualReferralAddress && serverReferralLamports > 0) {
      try {
        const referralPubkey = new PublicKey(actualReferralAddress);
        transaction.add(
          SystemProgram.transfer({ fromPubkey: buyerPubkey, toPubkey: vaultPubkey, lamports: vaultLamports }),
          SystemProgram.transfer({ fromPubkey: buyerPubkey, toPubkey: referralPubkey, lamports: serverReferralLamports }),
        );
      } catch (e) {
        console.error('[build-tx] Failed to add referral transfer, falling back to full vault transfer:', e);
        transaction.add(
          SystemProgram.transfer({ fromPubkey: buyerPubkey, toPubkey: vaultPubkey, lamports: finalTotalLamports }),
        );
      }
    } else {
      transaction.add(
        SystemProgram.transfer({ fromPubkey: buyerPubkey, toPubkey: vaultPubkey, lamports: finalTotalLamports }),
      );
    }

    // SPL Token Transfer: Treasury → Buyer (NFT/SFT)
    const treasuryATA = await getAssociatedTokenAddress(mintPubkey, treasuryPubkey);
    const buyerATA = await getAssociatedTokenAddress(mintPubkey, buyerPubkey);

    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(buyerPubkey, buyerATA, buyerPubkey, mintPubkey)
    );

    transaction.add(
      createTransferInstruction(treasuryATA, buyerATA, treasuryPubkey, parsedAmount)
    );

    // Set blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = buyerPubkey;

    // Partial sign by Treasury (authorizes NFT transfer)
    transaction.partialSign(treasuryKeypair);

    const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
    const base64Tx = serializedTransaction.toString('base64');

    return NextResponse.json({
      transaction: base64Tx,
      serverTotalLamports: finalTotalLamports,
      serverReferralLamports: serverReferralLamports,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('[build-tx] Unhandled error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
