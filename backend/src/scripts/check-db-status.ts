import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStatus() {
    try {
        const leadCounts = await prisma.campaignLead.groupBy({
            by: ['status'],
            _count: { _all: true }
        });
        console.log('--- Campaign Lead Statuses ---');
        console.log(leadCounts);

        const recentFailed = await prisma.campaignLead.findMany({
            where: { status: 'FAILED' },
            take: 5,
            orderBy: { updatedAt: 'desc' },
            select: { id: true, failureReason: true, updatedAt: true }
        });
        if (recentFailed.length > 0) {
            console.log('\n--- Recent Failures ---');
            recentFailed.forEach(f => {
                console.log(`ID: ${f.id}, Reason: ${f.failureReason}, Time: ${f.updatedAt}`);
            });
        }

        const mailboxes = await prisma.mailbox.findMany({
            select: { email: true, status: true, sentCount: true, dailyLimit: true }
        });
        console.log('\n--- Mailbox Status ---');
        console.log(mailboxes);

    } catch (error) {
        console.error('Status check failed:', error);
    } finally {
        await prisma.$disconnect();
        process.exit();
    }
}

checkStatus();
