require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing villas to ensure only the specified assets are shown
  await prisma.villa.deleteMany({});
  
  const v1 = await prisma.villa.upsert({
    where: { nftAddress: 'BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS' },
    update: {},
    create: {
      id: 'v1',
      name: 'Uluwatu Cliffside Villa',
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
      nftAddress: 'BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS',
      chain: 'solana',
      images: ['/assets/Villa 1.gif.mp4']
    }
  });

  const v2 = await prisma.villa.upsert({
    where: { nftAddress: 'd4Qqt3UzxcQBhqpRBZcQzknokCiGA82RRMzzwXBPYUg' },
    update: {},
    create: {
      id: 'v2',
      name: 'Ubud Jungle Retreat',
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
      nftAddress: 'd4Qqt3UzxcQBhqpRBZcQzknokCiGA82RRMzzwXBPYUg',
      chain: 'solana',
      images: ['/assets/Villa 2.gif.mp4']
    }
  });

  const v3 = await prisma.villa.upsert({
    where: { nftAddress: 'GABXPkqndQ7Fb7C2CST4pff1VkQXjcCtuvCdPpSRuQHy' },
    update: {},
    create: {
      id: 'v3',
      name: 'Seminyak Beachfront Villa',
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
      nftAddress: 'GABXPkqndQ7Fb7C2CST4pff1VkQXjcCtuvCdPpSRuQHy',
      chain: 'solana',
      images: ['/assets/Villa 3.gif.mp4']
    }
  });

  const v4 = await prisma.villa.upsert({
    where: { nftAddress: '5uNBRRYNEux1GovaiRrgaGJAHRUBp8hXQqNMdkFgFVf8' },
    update: {},
    create: {
      id: 'v4',
      name: 'Canggu Eco Villa',
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
      nftAddress: '5uNBRRYNEux1GovaiRrgaGJAHRUBp8hXQqNMdkFgFVf8',
      chain: 'solana',
      images: ['/assets/Villa 4.gif.mp4']
    }
  });

  const admin = await prisma.user.upsert({
    where: { address: '41MLp5oX9yYwNoMCcQUw9ZRZQazEacU5JThrGv6E5wMU' },
    update: {},
    create: {
      address: '41MLp5oX9yYwNoMCcQUw9ZRZQazEacU5JThrGv6E5wMU',
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
