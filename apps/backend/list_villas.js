const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const villas = await prisma.villa.findMany({
    select: { id: true, name: true, nftAddress: true, totalTokens: true, totalShares: true }
  });
  console.log(JSON.stringify(villas, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
