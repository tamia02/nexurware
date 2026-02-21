import { Worker } from 'bullmq';
import { redisConfig } from '../config/redis';
import { EmailService } from '../services/email.service';
import { EventService } from '../services/event.service';

const prisma = new PrismaClient();
const emailService = new EmailService();
const eventService = new EventService();

const worker = new Worker('email-sending-queue', async (job) => {
    console.log(`[Worker] Processing Job ${job.id}`);

    const { campaignId, leadId, emailBody, subject, senderEmail, senderName, campaignLeadId, sequenceId } = job.data;
    console.log(`[Worker] Job Data: Campaign=${campaignId}, Lead=${leadId}, CampLead=${campaignLeadId}, Sub=${subject}`);

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
        let finalBody = emailBody;

        // Personalization is handled by the SchedulerService now.
        // Worker just sends what it's given.

        const info = await emailService.sendEmail(
            mailbox,
            lead.email,
            subject,
            finalBody,
            undefined,
            campaignLeadId,
            sequenceId
        );

        if (campaignLeadId) {
            const campaignLead = await prisma.campaignLead.findUnique({
                where: { id: campaignLeadId },
                include: { campaign: { include: { sequences: { orderBy: { order: 'asc' } } } } }
            });

            if (campaignLead) {
                const currentStepIndex = campaignLead.currentStep;
                const nextStepIndex = currentStepIndex + 1;
                const sequences = campaignLead.campaign.sequences;
                let nextActionAt = null;

                if (nextStepIndex < sequences.length) {
                    const nextStep = sequences[nextStepIndex];
                    const delayMs = (nextStep.delayDays * 24 * 3600 * 1000) + (nextStep.delayHours * 3600 * 1000);
                    nextActionAt = new Date(Date.now() + delayMs);
                }

                await prisma.campaignLead.update({
                    where: { id: campaignLeadId },
                    data: {
                        status: 'SENT',
                        currentStep: nextStepIndex,
                        nextActionAt: nextActionAt
                    }
                });

                // Log Event
                await eventService.logEvent('EMAIL_SENT' as any, campaignLead.campaignId, campaignLead.leadId, sequenceId || null, {
                    messageId: info.messageId,
                    subject
                });
            }
        }

        console.log(`[Worker] Job ${job.id} Sent to ${lead.email} and status updated to SENT (Step incremented)`);
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
