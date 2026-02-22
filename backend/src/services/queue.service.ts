import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis';

// Define the Queue (No limiter here for BullMQ v5 usually, or depends on setup)
// We move limiter to Worker for processing control.
export const emailQueue = new Queue('email-sending-queue', {
    connection: redisConfig
});

export class QueueService {
    /**
     * Add an email job to the queue
     */
    static async addEmailJob(data: {
        campaignId: string;
        leadId?: string;
        recipientEmail?: string;
        emailBody: string;
        subject: string;
        senderEmail: string;
        senderName: string;
        campaignLeadId?: string;
        sequenceId?: string;
    }, opts?: { delay?: number }) {
        return await emailQueue.add('send-email', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            },
            removeOnComplete: true,
            removeOnFail: false,
            delay: opts?.delay || 0
        });
    }

    static async getMetrics() {
        return await emailQueue.getJobCounts();
    }
}
