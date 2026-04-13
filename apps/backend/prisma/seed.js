require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing villas to ensure only the specified assets are shown
  await prisma.villa.deleteMany({});
  
  const v1 = await prisma.villa.upsert({
    where: { nftAddress: '43riPPJd8QwqRjbhJZKewMjbc4iKhnTGJR9Magk1BqKG' },
    update: {},
    create: {
      id: 'v1',
      name: 'Villa Dreamland 1',
      location: 'Uluwatu, Bali',
      description: 'Premium fractionalized modern cliffside villa in Uluwatu, Bali.',
      pricePerShare: 100,
      totalValue: 4000000,
      totalShares: 40000,
      totalTokens: 40000,
      tokensSold: 0,
      bedrooms: 4,
      bathrooms: 4,
      sqm: 850,
      occupancyStatus: 'Active',
      ery: 12.5,
      ary: 12.5,
      legalStructure: 'FRACTIONAL_OWNERSHIP',
      nftAddress: '43riPPJd8QwqRjbhJZKewMjbc4iKhnTGJR9Magk1BqKG',
      chain: 'solana',
      images: ['/assets/Villa 1.gif.mp4']
    }
  });

  const v2 = await prisma.villa.upsert({
    where: { nftAddress: 'AUsosPL4ymUkqzisoUAMAqKj2VMGhduBhsS3ZnS7VXEy' },
    update: {},
    create: {
      id: 'v2',
      name: 'Villa Dreamland 2',
      location: 'Ubud, Bali',
      description: 'Luxury tropical jungle villa in Ubud.',
      pricePerShare: 100,
      totalValue: 4000000,
      totalShares: 40000,
      totalTokens: 40000,
      tokensSold: 0,
      bedrooms: 3,
      bathrooms: 3,
      sqm: 450,
      occupancyStatus: 'Active',
      ery: 9.2,
      ary: 9.2,
      legalStructure: 'FRACTIONAL_OWNERSHIP',
      nftAddress: 'AUsosPL4ymUkqzisoUAMAqKj2VMGhduBhsS3ZnS7VXEy',
      chain: 'solana',
      images: ['/assets/Villa 2.gif.mp4']
    }
  });

  const v3 = await prisma.villa.upsert({
    where: { nftAddress: 'BNGXwuS1Wg6SG9Dpai8pgCXUXbYJAvyFiHEg8y4WKhMT' },
    update: {},
    create: {
      id: 'v3',
      name: 'Villa Dreamland 3',
      location: 'Seminyak, Bali',
      description: 'Exclusive luxury beachfront villa in Seminyak.',
      pricePerShare: 100,
      totalValue: 4000000,
      totalShares: 40000,
      totalTokens: 40000,
      tokensSold: 0,
      bedrooms: 5,
      bathrooms: 5,
      sqm: 1200,
      occupancyStatus: 'Active',
      ery: 14.0,
      ary: 14.0,
      legalStructure: 'FRACTIONAL_OWNERSHIP',
      nftAddress: 'BNGXwuS1Wg6SG9Dpai8pgCXUXbYJAvyFiHEg8y4WKhMT',
      chain: 'solana',
      images: ['/assets/Villa 3.gif.mp4']
    }
  });

  const v4 = await prisma.villa.upsert({
    where: { nftAddress: 'HXnYCPQWz1eHV8ipEKNYZSqkW84fA9EYkD9HrWDfbwQJ' },
    update: {},
    create: {
      id: 'v4',
      name: 'Villa Dreamland 4',
      location: 'Canggu, Bali',
      description: 'Minimalist eco-friendly villa in Canggu.',
      pricePerShare: 100,
      totalValue: 4000000,
      totalShares: 40000,
      totalTokens: 40000,
      tokensSold: 0,
      bedrooms: 3,
      bathrooms: 3,
      sqm: 400,
      occupancyStatus: 'Active',
      ery: 11.0,
      ary: 11.0,
      legalStructure: 'FRACTIONAL_OWNERSHIP',
      nftAddress: 'HXnYCPQWz1eHV8ipEKNYZSqkW84fA9EYkD9HrWDfbwQJ',
      chain: 'solana',
      images: ['/assets/Villa 4.gif.mp4']
    }
  });

  const admin = await prisma.user.upsert({
    where: { address: '35wVymVGdjG3wVfG7XgFarmnK5bp6xDZ3QimpHzDVZqv' },
    update: {},
    create: {
      address: '35wVymVGdjG3wVfG7XgFarmnK5bp6xDZ3QimpHzDVZqv',
      name: 'ERP Admin',
      role: 'ADMIN'
    }
  });


  console.log({ v1, v2, v3, v4, admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
