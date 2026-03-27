import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  const address = params.address;

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    // Fetch all referrals for this referrer
    const referrals = await prisma.referral.findMany({
      where: {
        referrerAddress: address,
      },
      include: {
        referrer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalEarned = referrals.reduce((acc, ref) => acc + ref.commissionSol, 0);
    const totalReferrals = referrals.length;
    
    // In a real app, "pendingPayout" might come from a separate logic or field
    // For now, let's assume all recorded ones are earned, and we mock pending as 0 or a fraction
    const pendingPayout = 0; 

    const history = referrals.slice(0, 10).map(ref => ({
      date: ref.createdAt.toISOString().split('T')[0],
      amount: ref.commissionSol,
      villa: `Villa ${ref.villaId}`, // In a real app, join with Villa table for name
      status: ref.status
    }));

    return NextResponse.json({
      totalEarned,
      totalReferrals,
      pendingPayout,
      history
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return NextResponse.json({ error: 'Failed to fetch referral stats' }, { status: 500 });
  }
}
