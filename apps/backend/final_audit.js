const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking User table for old treasury address...");
    const oldTreasury = '35wVymVGdjG3wVfG7XgFarmnK5bp6xDZ3QimpHzDVZqv';
    const newTreasury = '3qvjpDu3wkvR11aAQAUTB3zxeyTyTUUDAT6wJXAK92hL';

    const users = await prisma.user.findMany({
        where: { address: oldTreasury }
    });

    if (users.length > 0) {
        console.log(`Found ${users.length} users with old treasury address. Updating...`);
        for (const user of users) {
             await prisma.user.update({
                where: { address: oldTreasury },
                data: { address: newTreasury }
             });
        }
        console.log("Update complete.");
    } else {
        console.log("No users found with the old treasury address.");
    }

    console.log("Checking for compromised address: EUWDRpaq8yc5X7paoA7GMfLieL8qUfB3MTm744v7kTim");
    const compromisedUsers = await prisma.user.findMany({
        where: { address: 'EUWDRpaq8yc5X7paoA7GMfLieL8qUfB3MTm744v7kTim' }
    });
    if (compromisedUsers.length > 0) {
        console.log(`ALERT: Found ${compromisedUsers.length} users with compromised address! Updating...`);
        // We'll rename them to distinguish them if they exist
        for (const u of compromisedUsers) {
             await prisma.user.delete({ where: { address: u.address } });
        }
        console.log("Compromised address entries removed.");
    } else {
        console.log("No users found with the compromised address.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
