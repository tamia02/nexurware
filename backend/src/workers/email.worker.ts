import { Worker } from 'bullmq';
import { redisConfig } from '../config/redis';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/email.service';

const prisma = new PrismaClient();
const emailService = new EmailService();

const worker = new Worker('email-sending-queue', async (job) => {
    console.log(`[Worker] Processing Job ${job.id}`);

    const { campaignId, leadId, emailBody, subject, senderEmail, senderName, campaignLeadId, sequenceId } = job.data;

    try {
        // 1. Fetch Fresh Data (Guard against stale jobs)
        // Actually, we pass everything in data. But we need Mailbox credentials.
        // We only have senderEmail. We need to find the Mailbox.
        const mailbox = await prisma.mailbox.findUnique({
            where: { email: senderEmail }
        });

        if (!mailbox) {
            throw new Error(`Mailbox ${senderEmail} not found`);
        }

        // 2. Fetch Lead (for email address) if not passed?
        // We passed leadId, but not leadEmail in data?
        // Wait, 'addEmailJob' only took leadId.
        // We need to fetch the lead to get the email!
        // My previous worker impl (Step 887) fetched payload.
        // My recent QueueService (Step 973) only passed IDs?
        // Let's check logic:
        // scheduler passed: campaignId, leadId, body, subject, sender...
        // It did NOT pass target email address.
        // So we MUST fetch Lead.

        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) throw new Error(`Lead ${leadId} not found`);

        // 3. Send
        await emailService.sendEmail(
            mailbox,
            lead.email,
            subject,
            emailBody,
            undefined,
            campaignLeadId,
            sequenceId
        );

        console.log(`[Worker] Job ${job.id} Sent to ${lead.email}`);
        return { sent: true };

    } catch (err) {
        console.error(`[Worker] Job ${job.id} Failed:`, err);

        // If this was the last attempt, mark as failed in DB
        // @ts-ignore
        if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
            if (campaignLeadId) {
                try {
                    await prisma.campaignLead.update({
                        where: { id: campaignLeadId },
                        data: { status: 'FAILED', failureReason: String(err) }
                    });
                } catch (dbErr) {
                    console.error('[Worker] Failed to update DB status:', dbErr);
                }
            }
        }
        throw err; // Triggers BullMQ retry
    }
}, {
    connection: redisConfig,
    limiter: {
        max: 5,
        duration: 1000 // 5 sends per second
    }
});

worker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`[Worker] Job ${job?.id} failed with ${err.message}`);
});

export default worker;
