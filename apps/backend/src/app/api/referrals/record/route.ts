import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://thehistorymaker.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { referrerAddress, investorAddress, villaId, amountSol, commissionSol, txHash } = body;

    // Validate required fields
    if (!referrerAddress || !investorAddress || !amountSol || !commissionSol) {
      return NextResponse.json(
        { error: 'Missing required fields: referrerAddress, investorAddress, amountSol, commissionSol' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Prevent self-referral
    if (referrerAddress === investorAddress) {
      return NextResponse.json(
        { error: 'Self-referral is not allowed' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Ensure the referrer user exists (upsert to create if not)
    await prisma.user.upsert({
      where: { address: referrerAddress },
      update: {},
      create: {
        address: referrerAddress,
        name: `Referrer ${referrerAddress.slice(0, 6)}`,
        role: 'INVESTOR',
      },
    });

    // Check for duplicate transaction hash
    if (txHash) {
      const existing = await prisma.referral.findUnique({
        where: { txHash },
      });
      if (existing) {
        return NextResponse.json(
          { message: 'Referral already recorded for this transaction' },
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Record the referral
    const referral = await prisma.referral.create({
      data: {
        referrerAddress,
        investorAddress,
        villaId: villaId || 'unknown',
        amountSol: parseFloat(amountSol.toString()),
        commissionSol: parseFloat(commissionSol.toString()),
        status: 'COMPLETED',
        txHash: txHash || null,
      },
    });

    console.log(`[Referral] Recorded: ${referrerAddress} earned ${commissionSol} SOL from ${investorAddress} (tx: ${txHash || 'N/A'})`);

    return NextResponse.json(
      { success: true, referralId: referral.id },
      { status: 201, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('[Referral] Error recording referral:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record referral' },
      { status: 500, headers: corsHeaders }
    );
  }
}
