require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Corrected NFT addresses and properties based on screenshot and on-chain data
// Properties from screenshot: Bedrooms 2, Bathrooms 2, Land Size 150m2, Total Fractions 6250
// Updated for actual .gif artwork downloaded from Arweave
async function main() {
  // Clear existing villas to ensure only the specified assets are shown
  await prisma.villa.deleteMany({});

  const commonProps = {
    pricePerShare: 100,
    totalValue: 625000,
    totalShares: 6250,
    totalTokens: 6250,
    tokensSold: 0,
    bedrooms: 2,
    bathrooms: 2,
    sqm: 150,
    occupancyStatus: 'Active',
    ery: 12.5,
    ary: 12.5,
    legalStructure: 'FRACTIONAL_OWNERSHIP',
    chain: 'solana',
    network: 'mainnet',
    mediaType: 'gif'
  };

  const v1 = await prisma.villa.upsert({
    where: { nftAddress: 'GEUiSkny4QjNWcA75NTiVNGfF6yLS7eRgf5vMyNDH64t' },
    update: {},
    create: {
      ...commonProps,
      id: 'v1',
      name: 'Villa Dreamland 1',
      location: 'Uluwatu, Bali',
      description: 'Premium fractionalized modern cliffside villa in Uluwatu, Bali.',
      nftAddress: 'GEUiSkny4QjNWcA75NTiVNGfF6yLS7eRgf5vMyNDH64t',
      images: ['/assets/Villa 1.gif']
    }
  });

  const v2 = await prisma.villa.upsert({
    where: { nftAddress: 'B33PmfmuzKDK8iDBA4VXafAM3QHnVDvipFdEkoCpUDyF' },
    update: {},
    create: {
      ...commonProps,
      id: 'v2',
      name: 'Villa Dreamland 2',
      location: 'Ubud, Bali',
      description: 'Luxury tropical jungle villa in Ubud.',
      nftAddress: 'B33PmfmuzKDK8iDBA4VXafAM3QHnVDvipFdEkoCpUDyF',
      images: ['/assets/Villa 2.gif']
    }
  });

  const v3 = await prisma.villa.upsert({
    where: { nftAddress: 'A4mhToRrLwi3LCyjKs6y4WAkD93itAMKH5Sq3vMRv9J4' },
    update: {},
    create: {
      ...commonProps,
      id: 'v3',
      name: 'Villa Dreamland 3',
      location: 'Seminyak, Bali',
      description: 'Exclusive luxury beachfront villa in Seminyak.',
      nftAddress: 'A4mhToRrLwi3LCyjKs6y4WAkD93itAMKH5Sq3vMRv9J4',
      images: ['/assets/Villa 3.gif']
    }
  });

  const v4 = await prisma.villa.upsert({
    where: { nftAddress: '9reQRL4jLQn7KUXu92iKHpycwqf1FtmywDkGGpJG69or' },
    update: {},
    create: {
      ...commonProps,
      id: 'v4',
      name: 'Villa Dreamland 4',
      location: 'Canggu, Bali',
      description: 'Minimalist eco-friendly villa in Canggu.',
      nftAddress: '9reQRL4jLQn7KUXu92iKHpycwqf1FtmywDkGGpJG69or',
      images: ['/assets/Villa 4.gif']
    }
  });

  const v5 = await prisma.villa.upsert({
    where: { nftAddress: 'D95cYTz9ADvvtrhzyNTrdCPEVrSJAiGNfzFyACtLiDpz' },
    update: {},
    create: {
      ...commonProps,
      id: 'v5',
      name: 'Villa Dreamland 5',
      location: 'Jimbaran, Bali',
      description: 'Exclusive oceanview villa in Jimbaran with private infinity pool.',
      nftAddress: 'D95cYTz9ADvvtrhzyNTrdCPEVrSJAiGNfzFyACtLiDpz',
      images: ['/assets/Villa 5.gif']
    }
  });

  await prisma.user.upsert({
    where: { address: '3qvjpDu3wkvR11aAQAUTB3zxeyTyTUUDAT6wJXAK92hL' },
    update: {},
    create: {
      address: '3qvjpDu3wkvR11aAQAUTB3zxeyTyTUUDAT6wJXAK92hL',
      name: 'ERP Admin',
      role: 'ADMIN'
    }
  });

  console.log('✅ Seeded villas with correct on-chain artwork (.gif)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
