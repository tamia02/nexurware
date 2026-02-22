
import { QueueService } from '../services/queue.service';
import { redisClient } from '../services/redis.service';
import dotenv from 'dotenv';

dotenv.config();

async function verify() {
    console.log("--- Nexusware Verification Script ---");

    // 1. Verify Warmup Queueing
    console.log("\n[1/2] Verifying Warmup Email Queueing...");
    try {
        const jobId = await QueueService.addEmailJob({
            campaignId: 'warmup_verify_test',
            recipientEmail: 'verify-warmup@example.com',
            emailBody: 'Verify warmup logic',
            subject: 'Verification',
            senderEmail: 'test@nexusware.ai',
            senderName: 'Verifier'
        });
        console.log(`✅ Warmup job queued successfully (ID: ${jobId?.id})`);
    } catch (err) {
        console.error("❌ Warmup queueing failed:", err);
    }

    // 2. Check Redis Connectivity with Keep-Alive
    console.log("\n[2/2] Verifying Redis with Keep-Alive...");
    try {
        const ping = await redisClient.ping();
        console.log(`✅ Redis Ping Result: ${ping}`);
    } catch (err) {
        console.error("❌ Redis Keep-Alive test failed:", err);
    }

    console.log("\n--- Verification Complete ---");
    process.exit(0);
}

verify();
