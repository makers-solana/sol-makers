const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.villa.update({
    where: { nftAddress: '43riPPJd8QwqRjbhJZKewMjbc4iKhnTGJR9Magk1BqKG' },
    data: {
      totalTokens: 6250,
      totalShares: 6250
    }
  });

  // also update seed.js to reflect the new numbers for future seeds
  const fs = require('fs');
  const seedPath = './prisma/seed.js';
  let seedContent = fs.readFileSync(seedPath, 'utf8');
  
  // Very crude and safe string replace for the v1 totalShares and totalTokens
  seedContent = seedContent.replace(/totalShares: 40000,\n\s*totalTokens: 40000,\n\s*tokensSold: 0,\n\s*bedrooms: 4/g, 'totalShares: 6250,\n      totalTokens: 6250,\n      tokensSold: 0,\n      bedrooms: 4');
  
  fs.writeFileSync(seedPath, seedContent);
  console.log("Updated Dreamland 1 in database and seed.js");
}

main().catch(console.error).finally(() => prisma.$disconnect());
