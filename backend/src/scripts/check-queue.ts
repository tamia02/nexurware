import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis';

async function checkQueue() {
    console.log('Connecting to Redis:', redisConfig);
    const emailQueue = new Queue('email-sending-queue', { connection: redisConfig });

    try {
        const counts = await emailQueue.getJobCounts();
        console.log('--- Queue Metrics ---');
        console.log(`Waiting: ${counts.waiting}`);
        console.log(`Active: ${counts.active}`);
        console.log(`Completed: ${counts.completed}`);
        console.log(`Failed: ${counts.failed}`);
        console.log(`Delayed: ${counts.delayed}`);

        const failedJobs = await emailQueue.getFailed();
        if (failedJobs.length > 0) {
            console.log('\n--- Recent Failed Jobs ---');
            failedJobs.slice(-5).forEach(job => {
                console.log(`Job ${job.id} failed: ${job.failedReason}`);
            });
        }

        const activeJobs = await emailQueue.getActive();
        if (activeJobs.length > 0) {
            console.log('\n--- Active Jobs ---');
            activeJobs.forEach(job => {
                console.log(`Job ${job.id} is currently being processed`);
            });
        }

    } catch (error) {
        console.error('Queue diagnostic failed:', error);
    } finally {
        await emailQueue.close();
        process.exit();
    }
}

checkQueue();
