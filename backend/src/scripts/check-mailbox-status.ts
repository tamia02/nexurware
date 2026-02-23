import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatus() {
    const mailboxes = await prisma.mailbox.findMany();
    console.log('--- Mailbox Status ---');
    if (mailboxes.length === 0) {
        console.log('No mailboxes found in the database.');
    }
    mailboxes.forEach(m => {
        console.log(`Email: ${m.email} | Status: ${m.status} | Warmup Enabled: ${m.warmupEnabled} | Sent Count: ${m.sentCount}`);
    });
    process.exit(0);
}

checkStatus().catch(e => {
    console.error(e);
    process.exit(1);
});
