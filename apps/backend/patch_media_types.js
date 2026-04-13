const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const villas = await prisma.villa.findMany();
  for (const villa of villas) {
    if (!villa.images || villa.images.length === 0) continue;
    
    // Default to 'image'
    let mediaType = 'image';
    
    // Check if it's one of the first 4 villas (which were videos)
    if (villa.name.includes('Villa Dreamland 1') || 
        villa.name.includes('Villa Dreamland 2') || 
        villa.name.includes('Villa Dreamland 3') || 
        villa.name.includes('Villa Dreamland 4')) {
      mediaType = 'video';
    } 
    
    // Update the record
    await prisma.villa.update({
      where: { id: villa.id },
      data: { mediaType }
    });
    console.log(`Updated ${villa.name} to mediaType: ${mediaType}`);
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
