import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client';
import { checkRole } from '../../../../lib/auth';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const address = request.headers.get('x-user-address');

    if (!address) {
      return NextResponse.json({ error: 'Auth address required' }, { status: 401 });
    }

    const isAuthorized = await checkRole(address, [Role.ADMIN, Role.MANAGER]);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Manager only' }, { status: 403 });
    }

    const villa = await prisma.villa.update({
      where: { id: params.id },
      data: {
        name: data.name,
        location: data.location,
        description: data.description,
        legalStructure: data.legalStructure,
        occupancyStatus: data.occupancyStatus,
        nightlyRate: data.nightlyRate,
        ery: data.ery !== undefined ? parseFloat(data.ery) : undefined,
        ary: data.ary !== undefined ? parseFloat(data.ary) : undefined,
        tokensSold: data.tokensSold !== undefined ? parseInt(data.tokensSold) : undefined,
        totalTokens: data.totalTokens !== undefined ? parseInt(data.totalTokens) : undefined,
        bedrooms: data.bedrooms !== undefined ? parseInt(data.bedrooms) : undefined,
        bathrooms: data.bathrooms !== undefined ? parseInt(data.bathrooms) : undefined,
        sqm: data.sqm !== undefined ? parseFloat(data.sqm) : undefined,
      }
    });
    return NextResponse.json(villa);
  } catch (error) {
    console.error('PATCH Villa Error:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const villa = await prisma.villa.findUnique({
      where: { id: params.id },
      include: {
        marketPrices: true,
        maintenanceLogs: true
      }
    });
    return NextResponse.json(villa);
  } catch (error) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
