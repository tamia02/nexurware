const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const sequences = await prisma.sequence.findMany({
            take: 5,
            orderBy: { id: 'desc' }
        });
        console.log('--- LAST 5 SEQUENCES ---');
        sequences.forEach(s => {
            console.log(`ID: ${s.id} | Subject: ${s.subject}`);
            console.log(`  Body: ${s.body?.substring(0, 100)}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
