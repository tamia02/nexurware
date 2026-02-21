import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    try {
        const leads = await prisma.campaignLead.findMany({
            where: {
                status: { in: ['CONTACTED', 'FAILED'] }
            },
            orderBy: { updatedAt: 'desc' },
            take: 20,
            include: {
                lead: { select: { email: true } },
                campaign: { select: { name: true, mailbox: true } }
            }
        });

        console.log('--- Detailed Lead Status (Last 20) ---');
        leads.forEach(l => {
            console.log(`ID: ${l.id}`);
            console.log(`Email: ${l.lead.email}`);
            console.log(`Campaign: ${l.campaign.name}`);
            console.log(`Status: ${l.status}`);
            console.log(`Step: ${l.currentStep}`);
            console.log(`Next Action: ${l.nextActionAt}`);
            console.log(`Failure Reason: ${l.failureReason}`);
            console.log(`Last Updated: ${l.updatedAt}`);
            console.log('---');
        });

        const mailboxes = await prisma.mailbox.findMany();
        console.log('\n--- Mailboxes Config (Sensors) ---');
        mailboxes.forEach(m => {
            console.log(`Email: ${m.email}, Status: ${m.status}, Host: ${m.smtpHost}:${m.smtpPort}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
