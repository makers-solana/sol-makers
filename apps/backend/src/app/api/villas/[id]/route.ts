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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Villa ID is required' }, { status: 400, headers: corsHeaders });
    }

    // Delete related records first to avoid foreign key constraint failures
    await prisma.maintenanceLog.deleteMany({ where: { villaId: id } });
    await prisma.marketPrice.deleteMany({ where: { villaId: id } });
    await prisma.share.deleteMany({ where: { villaId: id } });
    await prisma.payout.deleteMany({ where: { revenue: { villaId: id } } });
    await prisma.revenue.deleteMany({ where: { villaId: id } });
    await prisma.referral.deleteMany({ where: { villaId: id } });

    // Finally delete the villa
    await prisma.villa.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Asset deleted successfully' }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error deleting villa:', error);
    return NextResponse.json({ error: 'Failed to delete asset: ' + error.message }, { status: 500, headers: corsHeaders });
  }
}
