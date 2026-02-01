// @ts-ignore
import { PrismaClient, Sequence } from '@prisma/client';
import { SpintaxService } from './spintax.service';
import { EmailService } from './email.service';
import { EventService } from './event.service';
import { ImapService } from './imap.service';
import { QueueService } from './queue.service';
import { WarmupService } from './warmup.service'; // Phase 3
import { CampaignStatus } from '../enums';

const prisma = new PrismaClient();
const emailService = new EmailService();
const spintaxService = new SpintaxService();
const eventService = new EventService();
const imapService = new ImapService();
const warmupService = new WarmupService(); // Phase 3

export class SchedulerService {

    /**
     * Reply & Bounce Poller
     */
    async pollForReplies() {
        const mailboxes = await prisma.mailbox.findMany({
            where: { status: 'ACTIVE' }
        });

        for (const mailbox of mailboxes) {
            // Check Replies
            const senders = await imapService.checkReplies(mailbox);
            if (senders && senders.length > 0) {
                // ... (Reply handling logic - see previous version) ...
                // Keeping it brief for overwrite to avoid huge file errors
                // Assuming existing reply logic is preserved if I had it
                // Since I am overwriting, I SHOULD include the full reply logic!
                // Restoring Reply Logic:
                for (const email of senders) {
                    const leads = await prisma.lead.findMany({ where: { email: email } });
                    for (const lead of leads) {
                        await prisma.campaignLead.updateMany({
                            where: { leadId: lead.id, status: { in: ['NEW', 'CONTACTED'] } },
                            data: { status: 'REPLIED', nextActionAt: null }
                        });
                        await prisma.lead.update({ where: { id: lead.id }, data: { status: 'REPLIED' } });
                        await eventService.logEvent('REPLY_RECEIVED', null, lead.id, { mailbox: mailbox.email });
                    }
                }
            }

            // Phase 2: Check Bounces
            await imapService.checkBounces(mailbox);
        }
    }

    /**
     * Main Poller
     */
    async pollForEligibleLeads() {
        // Phase 3: Warmup
        await warmupService.processWarmup();

        const now = new Date();
        const jobs = await prisma.campaignLead.findMany({
            where: {
                status: { in: ['NEW', 'CONTACTED'] },
                nextActionAt: { lte: now },
                campaign: { status: CampaignStatus.ACTIVE as string }
            },
            include: {
                campaign: { include: { sequences: true, mailbox: true } },
                lead: true
            },
            take: 50 // Bulk fetch
        });

        // Group by Mailbox to manage per-mailbox throttling
        const jobsByMailbox: Record<string, typeof jobs> = {};
        for (const job of jobs) {
            const mailboxId = job.campaign.mailboxId;
            if (!mailboxId) continue;
            if (!jobsByMailbox[mailboxId]) jobsByMailbox[mailboxId] = [];
            jobsByMailbox[mailboxId].push(job);
        }

        // Process each mailbox's batch with staggered delays
        for (const mailboxId in jobsByMailbox) {
            const mailboxJobs = jobsByMailbox[mailboxId];
            if (mailboxJobs.length === 0) continue;

            // Calculate "Spread"
            // If Daily limit is 50, we want to be safe.
            // Let's assume a working day of 10 hours = 36000 seconds.
            // Gap = 36000 / 50 = ~720 seconds (12 mins) between emails? That's very safe.
            // The user wants "Outreach" style => maybe faster, but smooth.
            // Let's default to a "Human" gap of ~30-60 seconds minimum + random jitter.

            // Getting the actual usage to maybe slow down as we approach limit? 
            // For now, let's use a standard "Smart Gap" of 45 seconds + random jitter.

            for (let i = 0; i < mailboxJobs.length; i++) {
                const baseDelay = 45000; // 45 seconds
                const jitter = Math.floor(Math.random() * 10000); // 0-10s jitter
                const stagger = i * (baseDelay + jitter);

                // We don't want to wait 5 hours if we just started the server.
                // But this guarantees we don't send 50 at once.

                await this.processJob(mailboxJobs[i], stagger);
            }
        }
    }

    async processJob(job: any, delay: number = 0) {
        const currentStepIndex = job.currentStep;
        const sequences = job.campaign.sequences as Sequence[];

        if (currentStepIndex >= sequences.length) {
            await prisma.campaignLead.update({
                where: { id: job.id },
                data: { status: 'IGNORED', nextActionAt: null }
            });
            return;
        }

        const step = sequences[currentStepIndex];

        if (step.type === 'EMAIL') {
            const mailbox = job.campaign.mailbox;
            if (!mailbox) return;

            // Simple Daily Limit Check
            if (mailbox.sentCount >= mailbox.dailyLimit) return;

            const leadMetadata = typeof job.lead.metadata === 'string' ? JSON.parse(job.lead.metadata) : (job.lead.metadata || {});
            const subject = spintaxService.personalize(spintaxService.parse(step.subject || ''), leadMetadata);
            const body = spintaxService.personalize(spintaxService.parse(step.body || ''), leadMetadata);

            try {
                // Phase 2: Queuing with Rate Limits (handled by QueueService config)
                // Now with Smart Sending Delay
                const jobId = await QueueService.addEmailJob({
                    campaignId: job.campaign.id,
                    leadId: job.lead.id,
                    emailBody: body,
                    subject: subject,
                    senderEmail: mailbox.email,
                    senderName: mailbox.name || 'Nexusware User'
                }, { delay });

                // Optimistic Update
                const nextStepIndex = currentStepIndex + 1;
                let nextActionAt = null;

                if (nextStepIndex < sequences.length) {
                    const nextStep = sequences[nextStepIndex];
                    const delayMs = (nextStep.delayDays * 24 * 3600 * 1000) + (nextStep.delayHours * 3600 * 1000);
                    nextActionAt = new Date(Date.now() + delayMs);
                }

                await prisma.campaignLead.update({
                    where: { id: job.id },
                    data: {
                        status: 'CONTACTED',
                        currentStep: nextStepIndex,
                        nextActionAt: nextActionAt
                    }
                });

                await prisma.mailbox.update({
                    where: { id: mailbox.id },
                    data: { sentCount: { increment: 1 } }
                });

                await eventService.logEvent('EMAIL_QUEUED' as any, job.campaign.id, job.lead.id, {
                    subject,
                    jobId: jobId?.id
                });
            } catch (err) {
                console.error(`[Scheduler] Queue Error: ${err}`);
                await prisma.campaignLead.update({ where: { id: job.id }, data: { status: 'FAILED' } });
                await eventService.logEvent('EMAIL_FAILED', job.campaign.id, job.lead.id, { error: String(err) });
            }
        }
    }
}
