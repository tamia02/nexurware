// @ts-ignore
import { PrismaClient, CampaignLead, Sequence, Mailbox } from '@prisma/client';
import { SpintaxService } from './spintax.service';
import { EmailService } from './email.service';
import { EventService } from './event.service';
import { ImapService } from './imap.service';
import { CampaignStatus, StepType } from '../enums';

const prisma = new PrismaClient();
const emailService = new EmailService();
const spintaxService = new SpintaxService();
const eventService = new EventService();
const imapService = new ImapService();

export class SchedulerService {

    /**
     * Reply Poller: Checks IMAP for replies and stops sequences.
     */
    async pollForReplies() {
        const mailboxes = await prisma.mailbox.findMany({
            where: { status: 'ACTIVE' }
        });

        for (const mailbox of mailboxes) {
            const senders = await imapService.checkReplies(mailbox);

            if (senders.length > 0) {
                console.log(`[Scheduler] Found ${senders.length} new replies in ${mailbox.email}`);

                for (const email of senders) {
                    // Find leads with this email
                    const leads = await prisma.lead.findMany({
                        where: { email: email }
                    });

                    for (const lead of leads) {
                        // Mark CampaignLead as REPLIED (stops sequence)
                        await prisma.campaignLead.updateMany({
                            where: {
                                leadId: lead.id,
                                status: { in: ['NEW', 'CONTACTED'] }
                            },
                            data: {
                                status: 'REPLIED',
                                nextActionAt: null
                            }
                        });

                        // Optionally update Global Lead Status
                        await prisma.lead.update({
                            where: { id: lead.id },
                            data: { status: 'REPLIED' }
                        });

                        // Log Event
                        await eventService.logEvent('REPLY_RECEIVED', null, lead.id, { mailbox: mailbox.email });
                    }
                }
            }
        }
    }

    /**
     * Main Poller: Finds leads ready for the next step.
     * In production, this would be a Cron job running every minute.
     */
    async pollForEligibleLeads() {
        const now = new Date();

        // Find leads where nextActionAt is past
        const jobs = await prisma.campaignLead.findMany({
            where: {
                status: { in: ['NEW', 'CONTACTED'] },
                nextActionAt: { lte: now },
                campaign: {
                    status: CampaignStatus.ACTIVE as string
                }
            },
            include: {
                campaign: { include: { sequences: true, mailbox: true } },
                lead: true
            },
            take: 50 // process in batches
        });

        for (const job of jobs) {
            await this.processJob(job);
        }
    }

    async processJob(job: any) {
        const currentStepIndex = job.currentStep;
        const sequences = job.campaign.sequences as Sequence[];

        // Check if sequence finished
        if (currentStepIndex >= sequences.length) {
            await prisma.campaignLead.update({
                where: { id: job.id },
                data: { status: 'IGNORED', nextActionAt: null } // Or COMPLETED
            });
            return;
        }

        const step = sequences[currentStepIndex];

        if (step.type === 'EMAIL') {
            // 0. Get Mailbox (Strategy: Round Robin or Assigned)
            // For now, use Campaign assigned mailbox
            const mailbox = job.campaign.mailbox;

            if (!mailbox) {
                console.error(`[Scheduler] No mailbox assigned for Campaign ${job.campaign.id}`);
                return;
            }

            // Throttling Check
            if (mailbox.sentCount >= mailbox.dailyLimit) {
                console.warn(`[Scheduler] Mailbox ${mailbox.email} reached daily limit (${mailbox.dailyLimit}). Skipping.`);
                return; // Try again next poll (or implement complex rescheduling)
            }

            // 1. Prepare Content
            const leadMetadata = typeof job.lead.metadata === 'string' ? JSON.parse(job.lead.metadata) : (job.lead.metadata || {});
            const subject = spintaxService.personalize(spintaxService.parse(step.subject || ''), leadMetadata);
            const body = spintaxService.personalize(spintaxService.parse(step.body || ''), leadMetadata);

            // 2. Send Email
            try {
                await emailService.sendEmail(mailbox, job.lead.email, subject, body);

                // 3. Advance Step
                const nextStepIndex = currentStepIndex + 1;
                let nextActionAt = null;

                if (nextStepIndex < sequences.length) {
                    const nextStep = sequences[nextStepIndex];
                    // Calculate delay
                    const delayMs = (nextStep.delayDays * 24 * 60 * 60 * 1000) + (nextStep.delayHours * 60 * 60 * 1000);
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

                // Update Mailbox Stats
                await prisma.mailbox.update({
                    where: { id: mailbox.id },
                    data: { sentCount: { increment: 1 } }
                });

                // Log Event
                await eventService.logEvent('EMAIL_SENT', job.campaign.id, job.lead.id, {
                    messageId: undefined, // emailService returns it, but I need to capture it.
                    subject
                });

            } catch (err) {
                console.error(`[Scheduler] Failed to send email to ${job.lead.email}`, err);

                await prisma.campaignLead.update({
                    where: { id: job.id },
                    data: { status: 'FAILED' }
                });

                await eventService.logEvent('EMAIL_FAILED', job.campaign.id, job.lead.id, {
                    error: String(err)
                });
            }
        }
    }
}
