// @ts-ignore
import { PrismaClient, Sequence } from '@prisma/client';
import { SpintaxService } from './spintax.service';
import { EmailService } from './email.service';
import { EventService } from './event.service';
import { ImapService } from './imap.service';
import { QueueService } from './queue.service';
import { WarmupService } from './warmup.service'; // Phase 3
import { formatInTimeZone } from 'date-fns-tz'; // Phase 2: Timezones
import { CampaignStatus } from '../enums';
import { redisClient } from './redis.service';

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
                        await eventService.logEvent('REPLY_RECEIVED', null, lead.id, null, { mailbox: mailbox.email });
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

        // Phase 4: Completion Check
        await this.checkCampaignCompletion();

        const now = new Date();
        const jobs = await prisma.campaignLead.findMany({
            where: {
                status: { in: ['NEW', 'CONTACTED'] },
                nextActionAt: { lte: now },
                campaign: {
                    status: CampaignStatus.ACTIVE as string,
                    // Respect Scheduled Start Time
                    scheduledAt: { lte: now }
                }
            },
            include: {
                campaign: { include: { sequences: true, mailbox: true } },
                lead: true
            },
            take: 50 // Bulk fetch
        });

        // Group by Mailbox to manage per-mailbox throttling
        const jobsByMailbox: Record<string, typeof jobs> = {};
        const skippedJobIds: string[] = [];

        // Check Windows (Phase 2) - Optional now
        const validJobs = [];
        for (const job of jobs) {
            const campaign = job.campaign;
            if (campaign.timezone && campaign.startTime && campaign.endTime) {
                const currentHour = parseInt(formatInTimeZone(now, campaign.timezone, 'HH'));
                const startHour = parseInt(campaign.startTime.split(':')[0]);
                const endHour = parseInt(campaign.endTime.split(':')[0]);

                if (currentHour < startHour || currentHour >= endHour) {
                    // Outside Window. Reschedule.
                    // Calculate delay until StartHour (today or tomorrow)
                    let delayMs = 60 * 60 * 1000; // Default 1 hr

                    if (currentHour >= endHour) {
                        // Tomorrow at StartHour
                        delayMs = (24 - currentHour + startHour) * 3600 * 1000;
                    } else if (currentHour < startHour) {
                        // Today at StartHour
                        delayMs = (startHour - currentHour) * 3600 * 1000;
                    }

                    // Add a bit of jitter (0-5 mins) to avoid thundering herd
                    delayMs += Math.random() * 5 * 60 * 1000;

                    await prisma.campaignLead.update({
                        where: { id: job.id },
                        data: { nextActionAt: new Date(now.getTime() + delayMs) }
                    });
                    skippedJobIds.push(job.id);
                    continue;
                }
            }
            validJobs.push(job);
        }

        // Group Valid Jobs
        for (const job of validJobs) {
            const mailboxId = job.campaign.mailboxId;
            if (!mailboxId) continue;
            if (!jobsByMailbox[mailboxId]) jobsByMailbox[mailboxId] = [];
            jobsByMailbox[mailboxId].push(job);
        }

        // Process each mailbox's batch with SERIALIZED variable delays from Redis
        for (const mailboxId in jobsByMailbox) {
            const mailboxJobs = jobsByMailbox[mailboxId];
            if (mailboxJobs.length === 0) continue;

            const redisKey = `mailbox:${mailboxId}:next_send_at`;
            let nextSendAtTs = Date.now();

            try {
                const storedTs = await redisClient.get(redisKey);
                if (storedTs) {
                    nextSendAtTs = parseInt(storedTs);
                    // If stored time is in the past, reset to now to avoid huge burst catches up
                    if (nextSendAtTs < Date.now()) {
                        nextSendAtTs = Date.now();
                    }
                }
            } catch (error) {
                console.error(`[Scheduler] Redis Get Error: ${error}`);
            }

            for (const job of mailboxJobs) {
                // Use Campaign Pacing Interval (Minutes -> Milliseconds)
                // Default to 5 minutes if not set in DB
                const pacingMinutes = job.campaign.pacingInterval || 5;
                const pacingDelay = pacingMinutes * 60 * 1000;

                // Schedule at the next available slot
                const scheduledTime = nextSendAtTs + pacingDelay;

                // Calculate delay relative to NOW for the queue
                const queueDelay = Math.max(0, scheduledTime - Date.now());

                await this.processJob(job, queueDelay);

                // Update next slot
                nextSendAtTs = scheduledTime;
            }

            // Save the new nextSendAt to Redis
            try {
                // Set TTL to 24 hours
                await redisClient.set(redisKey, nextSendAtTs.toString(), 'EX', 86400);
            } catch (error) {
                console.error(`[Scheduler] Redis Set Error: ${error}`);
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

        // ---------------------------------------------------------
        // Conditional Logic Check
        // ---------------------------------------------------------
        let conditionMet = true;
        const condition = (step as any).condition || 'ALWAYS'; // Default to ALWAYS if not in DB yet

        if (condition === 'IF_NO_OPEN') {
            const hasOpened = await prisma.event.findFirst({
                where: {
                    leadId: job.lead.id,
                    campaignId: job.campaign.id,
                    type: 'OPEN'
                }
            });
            if (hasOpened) conditionMet = false;
        } else if (condition === 'IF_NO_REPLY') {
            // Main query already filters 'REPLIED', but double check for safety or specific logic
            if (job.lead.status === 'REPLIED' || job.status === 'REPLIED') conditionMet = false;
        } else if (condition === 'IF_CLICKED') {
            const hasClicked = await prisma.event.findFirst({
                where: {
                    leadId: job.lead.id,
                    campaignId: job.campaign.id,
                    type: 'CLICK'
                }
            });
            if (!hasClicked) conditionMet = false;
        }

        if (!conditionMet) {
            // SKIP THIS STEP
            await eventService.logEvent('STEP_SKIPPED' as any, job.campaign.id, job.lead.id, null, {
                stepIndex: currentStepIndex,
                reason: `Condition ${condition} not met`
            });

            // Move to next step immediately
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
                    currentStep: nextStepIndex,
                    nextActionAt: nextActionAt,
                    // If we skip the last step, is it 'COMPLETED'? 
                    // For now, let's keep status as is (e.g. CONTACTED) unless it's the end.
                    // If nextStepIndex >= sequences.length, the next poll will set it to IGNORED/COMPLETED?
                    // The next poll checks `currentStep >= sequences.length` and sets IGNORED. 
                    // So we just update index here.
                }
            });
            return;
        }
        // ---------------------------------------------------------

        if (step.type === 'EMAIL') {
            const mailbox = job.campaign.mailbox;
            if (!mailbox) return;

            // Simple Daily Limit Check
            if (mailbox.sentCount >= mailbox.dailyLimit) return;

            const rawMetadata = typeof job.lead.metadata === 'string' ? JSON.parse(job.lead.metadata) : (job.lead.metadata || {});

            // Merge direct lead fields for personalization
            const personalizationData = {
                firstName: job.lead.firstName || '',
                lastName: job.lead.lastName || '',
                company: job.lead.company || '',
                email: job.lead.email || '',
                ...rawMetadata
            };

            const subject = spintaxService.personalize(spintaxService.parse(step.subject || ''), personalizationData);
            const body = spintaxService.personalize(spintaxService.parse(step.body || ''), personalizationData);

            try {
                // Phase 2: Queuing with Rate Limits (handled by QueueService config)
                // Now with Smart Sending Delay
                const jobId = await QueueService.addEmailJob({
                    campaignId: job.campaign.id,
                    leadId: job.lead.id,
                    emailBody: body,
                    subject: subject,
                    senderEmail: mailbox.email,
                    senderName: mailbox.name || 'Nexusware User',
                    campaignLeadId: job.id,
                    sequenceId: step.id
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

                await eventService.logEvent('EMAIL_QUEUED' as any, job.campaign.id, job.lead.id, step.id, {
                    subject,
                    jobId: jobId?.id
                });
            } catch (err) {
                console.error(`[Scheduler] Queue Error: ${err}`);
                await prisma.campaignLead.update({
                    where: { id: job.id },
                    data: { status: 'FAILED', failureReason: String(err) }
                });
                await eventService.logEvent('EMAIL_FAILED', job.campaign.id, job.lead.id, step.id, { error: String(err) });
            }
        }
    }

    async checkCampaignCompletion() {
        // Find ACTIVE campaigns where ALL leads are in terminal states (REPLIED, IGNORED, FAILED)
        // Or if all leads have finished their sequences.

        // This is a bit expensive to run every poll. Maybe run every 10th poll or separate cron.
        // For now, let's keep it simple: Find campaigns that are ACTIVE but have NO pending leads.

        const activeCampaigns = await prisma.campaign.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, name: true }
        });

        for (const campaign of activeCampaigns) {
            const pendingLeads = await prisma.campaignLead.count({
                where: {
                    campaignId: campaign.id,
                    status: { in: ['NEW', 'CONTACTED'] },
                    // If currentStep < sequences.count, it's pending.
                    // But 'CONTACTED' implies we are waiting.
                    // If 'nextActionAt' is null, it might be done? 
                    // No, 'nextActionAt' is null if we are waiting for a reply and it's 'IF_NO_REPLY'.
                    // So we can't just check pendingLeads count easily without checking specific conditions.

                    // Simplified: If NO leads have 'nextActionAt' set? 
                    // No, that misses leads waiting for reply.
                }
            });

            // To properly detect "Completion", we need to know if there's ANY future work.
            // Future work = 
            // 1. Leads with nextActionAt != null (Scheduled emails)
            // 2. Leads with status 'NEW' (Not started)
            // 3. What about leads waiting for reply? If timeout passes? 
            //    Our scheduler handles "IF_NO_REPLY" by eventually moving to next step.

            // So, checking if there are ANY leads with (status IN [NEW, CONTACTED]) should be enough?
            // If 0 pending leads, campaign is done.

            if (pendingLeads === 0) {
                console.log(`[Scheduler] Campaign ${campaign.name} (${campaign.id}) is complete!`);
                await prisma.campaign.update({
                    where: { id: campaign.id },
                    data: { status: 'COMPLETED' }
                });

                // TODO: Send Email Notification to User
                // await emailService.sendNotification(userEmail, "Campaign Complete", ...);
            }
        }
    }
}
