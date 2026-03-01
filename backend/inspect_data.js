const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const leads = await prisma.lead.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' }
        });
        console.log('--- LAST 10 LEADS ---');
        leads.forEach(l => {
            console.log(`Email: ${l.email} | First: ${l.firstName} | Last: ${l.lastName} | Company: ${l.company}`);
        });

        const campaignLeads = await prisma.campaignLead.findMany({
            take: 5,
            include: { lead: true, campaign: { include: { sequences: true } } }
        });
        console.log('--- CAMPAIGN LEADS ---');
        campaignLeads.forEach(cl => {
            console.log(`CL ID: ${cl.id} | Lead: ${cl.lead.email} | Status: ${cl.status}`);
            if (cl.campaign.sequences.length > 0) {
                console.log(`  Step 1 Body Snippet: ${cl.campaign.sequences[0].body?.substring(0, 50)}...`);
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
