require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing villas to ensure only the specified assets are shown
  await prisma.villa.deleteMany({});
  
  const v1 = await prisma.villa.upsert({
    where: { nftAddress: '0x2B91E94Ce68cDf1321269c135Fbb12A2C1F781E5' },
    update: {},
    create: {
      name: 'Makers Villa Bali',
      location: 'Indonesia',
      description: 'Premium fractionalized villa asset "Makers Villa Bali" (Edition Drop) - 40,000 shares available at 0.035 ETH each.',
      pricePerShare: 0.035,
      totalValue: 1400, // 40000 * 0.035
      totalShares: 40000,
      totalTokens: 40000,
      tokensSold: 0,
      bedrooms: 3,
      bathrooms: 3,
      sqm: 450,
      occupancyStatus: 'Active',
      nightlyRate: 0,
      ery: 8.5,
      ary: 8.5,
      legalStructure: 'FRACTIONAL_OWNERSHIP',
      nftAddress: '0x2B91E94Ce68cDf1321269c135Fbb12A2C1F781E5',
      chain: 'ethereum',
      images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=800']
    }
  });

  const v2 = await prisma.villa.upsert({
    where: { nftAddress: 'BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS' },
    update: {},
    create: {
      name: 'Solana Sunset Villa',
      location: 'Uluwatu, Bali',
      description: 'Luxurious Solana-based villa asset. High yield potential in the heart of Uluwatu.',
      pricePerShare: 0.48,
      totalValue: 2400, // 5000 * 0.48
      totalShares: 5000,
      totalTokens: 5000,
      tokensSold: 1,
      bedrooms: 4,
      bathrooms: 4,
      sqm: 600,
      occupancyStatus: 'Active',
      nightlyRate: 0,
      ery: 10.2,
      ary: 10.2,
      legalStructure: 'FRACTIONAL_OWNERSHIP',
      nftAddress: 'BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS',
      chain: 'solana',
      images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800']
    }
  });

  const admin = await prisma.user.upsert({
    where: { address: '0xdebug_admin_address' },
    update: {},
    create: {
      address: '0xdebug_admin_address',
      name: 'ERP Admin',
      role: 'ADMIN'
    }
  });

  console.log({ v1, v2, admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
