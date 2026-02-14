import nodemailer from 'nodemailer';
// @ts-ignore
import { Mailbox } from '@prisma/client';

export class EmailService {

    private createTransporter(mailbox: Mailbox) {
        return nodemailer.createTransport({
            host: mailbox.smtpHost,
            port: mailbox.smtpPort,
            secure: mailbox.smtpPort === 465, // true for 465, false for other ports
            auth: {
                user: mailbox.smtpUser,
                pass: mailbox.smtpPass,
            },
        });
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
        const transporter = this.createTransporter(mailbox);

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
            const info = await transporter.sendMail({
                from: `"${mailbox.fromName || mailbox.name || mailbox.email}" <${mailbox.email}>`,
                to,
                subject,
                html: finalBody,
                replyTo: replyTo || undefined
            });

            console.log(`Email sent: ${info.messageId}`);
            return { messageId: info.messageId };
        } catch (error) {
            console.error("Error sending email:", error);
            throw error;
        }
    }
}
