const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Check ---');
    try {
        const userCount = await prisma.user.count();
        console.log(`Total Users: ${userCount}`);

        const users = await prisma.user.findMany({
            take: 5,
            select: { email: true, createdAt: true }
        });
        console.log('Latest 5 users:', users);

        const workspaceCount = await prisma.workspace.count();
        console.log(`Total Workspaces: ${workspaceCount}`);

    } catch (error) {
        console.error('Error connecting to database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
