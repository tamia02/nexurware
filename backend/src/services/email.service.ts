import nodemailer from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';
// @ts-ignore
import { Mailbox } from '@prisma/client';

const lookup = promisify(dns.lookup);

export class EmailService {
    private transporters: Map<string, nodemailer.Transporter> = new Map();

    private getTransporter(mailbox: Mailbox): nodemailer.Transporter {
        const cacheKey = mailbox.id;
        if (this.transporters.has(cacheKey)) {
            return this.transporters.get(cacheKey)!;
        }

        console.log(`[EmailService] Creating pooled transporter for ${mailbox.email} (Host: ${mailbox.smtpHost}:${mailbox.smtpPort})`);
        const transporter = nodemailer.createTransport({
            host: mailbox.smtpHost,
            port: mailbox.smtpPort,
            secure: mailbox.smtpPort === 465,
            auth: {
                user: mailbox.smtpUser,
                pass: mailbox.smtpPass,
            },
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            connectionTimeout: 30000, // Increased to 30s
            greetingTimeout: 30000,   // Increased to 30s
            socketTimeout: 45000,     // Increased to 45s
            debug: true,
            logger: true
        });

        this.transporters.set(cacheKey, transporter);
        return transporter;
    }

    private async checkDns(host: string) {
        try {
            const result = await lookup(host);
            console.log(`[EmailService] DNS Lookup for ${host}: ${result.address}`);
        } catch (err) {
            console.error(`[EmailService] DNS Lookup FAILED for ${host}:`, err);
            throw new Error(`DNS Lookup Failed for ${host}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    async sendEmail(
        mailbox: Mailbox,
        to: string,
        subject: string,
        html: string,
        replyTo?: string,
        campaignLeadId?: string, // Phase 4
        sequenceId?: string
    ): Promise<{ messageId: string }> {
        // DNS Pre-check to catch DNS-related timeouts early
        await this.checkDns(mailbox.smtpHost);

        const transporter = this.getTransporter(mailbox);
        // ... (rest of the tracking logic)

        let finalBody = html;

        // Phase 4: Inject Tracking
        if (campaignLeadId) {
            const baseUrl = process.env.API_URL || 'http://localhost:3001';

            // 1. Inject Pixel
            const pixelUrl = `${baseUrl}/tracking/open?id=${campaignLeadId}&step=${sequenceId || ''}`;
            finalBody += `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none;" />`;

            // 2. Rewrite Links (Regex)
            // Replace <a href="..."> with Tracking URL
            finalBody = finalBody.replace(/href="(http[^"]+)"/g, (match, url) => {
                // Avoid rewriting tracking links if already present
                if (url.includes('/tracking/')) return match;
                const trackUrl = `${baseUrl}/tracking/click?url=${encodeURIComponent(url)}&id=${campaignLeadId}&step=${sequenceId || ''}`;
                return `href="${trackUrl}"`;
            });
        }

        try {
            console.log(`[EmailService] Attempting to send email to ${to}...`);
            const info = await transporter.sendMail({
                from: `"${mailbox.fromName || mailbox.name || mailbox.email}" <${mailbox.email}>`,
                to,
                subject,
                html: finalBody,
                replyTo: replyTo || undefined
            });

            console.log(`[EmailService] Success! MessageID: ${info.messageId}`);
            return { messageId: info.messageId };
        } catch (error) {
            console.error("Error sending email:", error);
            throw error;
        }
    }
}
