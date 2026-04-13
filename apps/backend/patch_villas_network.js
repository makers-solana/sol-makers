const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const villas = await prisma.villa.findMany();
  for (const villa of villas) {
    let network = 'mainnet';
    
    // For now, these known IDs/Names are Devnet
    if (villa.name.includes('Villa Dreamland 3') || 
        villa.name.includes('Villa Dreamland 5')) {
      network = 'devnet';
    } 
    
    await prisma.villa.update({
      where: { id: villa.id },
      data: { network }
    });
    console.log(`Updated ${villa.name} to network: ${network}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
