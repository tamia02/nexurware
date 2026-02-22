
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import * as nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function diagnose() {
    console.log("--- Nexusware Connection Diagnosis ---");

    // 1. Test Database
    console.log("\n[1/3] Testing Database (Prisma/Neon)...");
    const prisma = new PrismaClient();
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        console.log(`✅ Database Connected (took ${Date.now() - start}ms)`);
    } catch (err) {
        console.error("❌ Database Connection Failed:", err);
    } finally {
        await prisma.$disconnect();
    }

    // 2. Test Redis
    console.log("\n[2/3] Testing Redis (Upstash)...");
    if (!process.env.REDIS_URL) {
        console.error("❌ REDIS_URL not found in .env");
    } else {
        const redis = new Redis(process.env.REDIS_URL, {
            connectTimeout: 5000,
            maxRetriesPerRequest: 1
        });
        try {
            const start = Date.now();
            await redis.ping();
            console.log(`✅ Redis Connected (took ${Date.now() - start}ms)`);
        } catch (err) {
            console.error("❌ Redis Connection Failed:", err);
        } finally {
            redis.disconnect();
        }
    }

    // 3. Test SMTP (Sample from DB if available)
    console.log("\n[3/3] Testing SMTP (from first Mailbox in DB)...");
    const prisma2 = new PrismaClient();
    try {
        const mailbox = await prisma2.mailbox.findFirst();
        if (!mailbox) {
            console.log("⚠️ No mailboxes found in DB to test.");
        } else {
            console.log(`Testing with ${mailbox.email} (${mailbox.smtpHost}:${mailbox.smtpPort})...`);
            const transporter = nodemailer.createTransport({
                host: mailbox.smtpHost,
                port: mailbox.smtpPort,
                secure: mailbox.smtpPort === 465,
                auth: {
                    user: mailbox.smtpUser,
                    pass: mailbox.smtpPass
                },
                connectionTimeout: 5000
            });
            const start = Date.now();
            await transporter.verify();
            console.log(`✅ SMTP Connection Successful (took ${Date.now() - start}ms)`);
        }
    } catch (err) {
        console.error("❌ SMTP Connection Failed:", err);
    } finally {
        await prisma2.$disconnect();
    }

    console.log("\n--- Diagnosis Complete ---");
}

diagnose();
