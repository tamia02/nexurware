
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking Campaign Leads (JSON)...");
    const leads = await prisma.campaignLead.findMany({
        include: { lead: true, campaign: true }
    });

    // Simple log
    const data = leads.map(l => ({
        Campaign: l.campaign.name,
        Email: l.lead.email,
        Status: l.status,
        NextAction: l.nextActionAt
    }));
    console.log(JSON.stringify(data, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
