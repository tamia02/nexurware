import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking Lead model for batch fields...');
        // We don't need to actually find anything, just check if the query compiles/runs
        await prisma.lead.findMany({
            where: { batchId: { not: null } },
            take: 1
        });
        console.log('SUCCESS: batchId is recognized by Prisma client.');
    } catch (err) {
        console.error('FAILURE:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
