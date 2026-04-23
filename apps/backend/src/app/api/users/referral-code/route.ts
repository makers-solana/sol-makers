import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';


const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://thehistorymaker.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function generateShortCode(): string {
  // Generate a random 6-character alphanumeric code
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400, headers: corsHeaders });
    }

    // Try to find the user
    let user = await prisma.user.findUnique({
      where: { address }
    });

    if (user && user.referralCode) {
      return NextResponse.json({ referralCode: user.referralCode }, { headers: corsHeaders });
    }

    // User exists but has no code, or doesn't exist
    // Generate a unique code
    let newCodeStr = '';
    let isUnique = false;
    
    // Safety loop to ensure uniqueness
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      newCodeStr = generateShortCode();
      const existing = await prisma.user.findUnique({ where: { referralCode: newCodeStr } });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
       return NextResponse.json({ error: 'Failed to generate a unique code' }, { status: 500, headers: corsHeaders });
    }

    user = await prisma.user.upsert({
      where: { address },
      update: {
        referralCode: newCodeStr
      },
      create: {
        address,
        name: `Referrer ${address.slice(0, 6)}`,
        role: 'INVESTOR',
        referralCode: newCodeStr
      }
    });

    return NextResponse.json({ referralCode: user.referralCode }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in referral-code endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
