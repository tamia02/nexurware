// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { QueueService } from './queue.service';
import { SpintaxService } from './spintax.service'; // We need this service or basic random logic

const prisma = new PrismaClient();
const spintaxService = new SpintaxService();

export class WarmupService {

    /**
     * Trigger Warmup Emails
     * Called by Scheduler daily/hourly
     */
    async processWarmup() {
        // 1. Find mailboxes with warmup enabled
        const mailboxes = await prisma.mailbox.findMany({
            where: {
                status: 'ACTIVE',
                warmupEnabled: true
            }
        });

        console.log(`[Warmup] Processing ${mailboxes.length} mailboxes for warmup`);

        if (mailboxes.length === 0) return;

        // Get peer pool (all active mailboxes) to send TO
        const peerMailboxes = await prisma.mailbox.findMany({
            where: { status: 'ACTIVE' },
            select: { email: true }
        });
        const peerEmails = peerMailboxes.map(p => p.email);

        for (const mailbox of mailboxes) {
            await this.scheduleWarmupEmails(mailbox, peerEmails);
        }
    }

    private async scheduleWarmupEmails(mailbox: any, peerEmails: string[]) {
        if (!mailbox.warmupStartedAt) return;

        // 1. Calculate Daily Limit (Ramp Up)
        // Formula: 5 + (Days * 2) -> Max 50
        const now = Date.now();
        const start = new Date(mailbox.warmupStartedAt).getTime();
        const daysRunning = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
        const dailyTarget = Math.min(50, 5 + (daysRunning * 2));

        // Check "Sent Count"
        // Ideally we check 'warmupSentCount', but 'sentCount' is fine for global limits
        if (mailbox.sentCount >= dailyTarget) {
            // console.log(`[Warmup] Mailbox ${mailbox.email} hit daily target (${dailyTarget})`);
            return;
        }

        // 2. Select Peer
        const potentialPeers = peerEmails.filter(e => e !== mailbox.email);
        if (potentialPeers.length === 0) return;

        const recipient = potentialPeers[Math.floor(Math.random() * potentialPeers.length)];

        // 3. Queue Email
        // Random Subject/Body
        const subjects = ["Quick question", "Hey", "Hello", "Following up", "Meeting?", "Chat?"];
        const bodies = [
            "Hi, just checking in.",
            "Are you free later?",
            "Can we sync up?",
            "Hope you are well.",
            "Let me know if you got this."
        ];

        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const body = bodies[Math.floor(Math.random() * bodies.length)];

        // Add to Queue
        const jobId = await QueueService.addEmailJob({
            campaignId: 'warmup',
            recipientEmail: recipient,
            emailBody: body,
            subject: subject,
            senderEmail: mailbox.email,
            senderName: mailbox.fromName || mailbox.name || 'Warmup User'
        });

        console.log(`[Warmup] Queued warmup email from ${mailbox.email} to ${recipient} (Daily Target: ${dailyTarget})`);
    }

    /**
     * Calculate a health score (0-100)
     */
    public static calculateHealthScore(mailbox: any): number {
        let score = 0;

        // 1. Connectivity (Base)
        if (mailbox.status === 'ACTIVE') {
            score += 20;
        } else {
            return 0; // If disconnected/error, it's unhealthy
        }

        // 2. Warmup Progress
        if (mailbox.warmupEnabled && mailbox.warmupStartedAt) {
            const now = Date.now();
            const start = new Date(mailbox.warmupStartedAt).getTime();
            const daysRunning = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
            const currentDailyTarget = Math.min(50, 5 + (daysRunning * 2));

            // 80 points allocated to warmup progress
            score += Math.floor((currentDailyTarget / 50) * 80);
        } else {
            // If warmup is disabled but status is ACTIVE, we assume it's "ready for work" 
            // but might not be fully warmed up if it was a new domain.
            // Let's give it 80 points if ACTIVE but not warming up.
            score += 80;
        }

        return Math.min(100, score);
    }
}
