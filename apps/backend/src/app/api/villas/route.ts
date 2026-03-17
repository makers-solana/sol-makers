import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const ETH_NFT_ADDRESS = "0x2B91E94Ce68cDf1321269c135Fbb12A2C1F781E5";
    const SOL_NFT_ADDRESS = "BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS";

    const villas = await prisma.villa.findMany({
      where: {
        OR: [
          { nftAddress: ETH_NFT_ADDRESS },
          { nftAddress: SOL_NFT_ADDRESS }
        ]
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

    // Transform data to match the expected format if necessary
    const formattedVillas = villas.map(v => ({
      ...v,
      erp: {
        occupancy: v.occupancyStatus,
        nightlyRate: v.nightlyRate,
        ery: `${v.ery}%`,
        ary: `${v.ary}%`,
        totalTokens: v.totalTokens,
        tokensSold: v.tokensSold,
        nextPayout: '2024-04-10', // Placeholder for logic
        maintenance: {
          last: v.lastMaintenance,
          next: v.nextMaintenance
        },
        marketPrice: {
          secondary: v.marketPrices[0]?.price || 0,
          trend: '+5%' // Placeholder logic
        }
      }
    }));

    return NextResponse.json(formattedVillas);
  } catch (error) {
    console.error('Error fetching villas:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
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
    return NextResponse.json(villa);
  } catch (error) {
    console.error('Error creating villa:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
