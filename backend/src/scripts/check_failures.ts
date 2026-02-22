
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function checkFailures() {
    console.log("--- Checking Latest Campaign Failures ---");
    try {
        const failures = await prisma.campaignLead.findMany({
            where: { status: 'FAILED' },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: {
                lead: true,
                campaign: true
            }
        });

        if (failures.length === 0) {
            console.log("No failed leads found in the database.");
        } else {
            failures.forEach(f => {
                console.log(`Campaign: ${f.campaign.name} | Lead: ${f.lead.email}`);
                console.log(`Failure Reason:\n${f.failureReason}`);
                console.log(`Updated At: ${f.updatedAt}`);
                console.log('---');
            });
        }
    } catch (err) {
        console.error("Error querying database:", err);
    } finally {
        await prisma.$disconnect();
    }
}

checkFailures();
