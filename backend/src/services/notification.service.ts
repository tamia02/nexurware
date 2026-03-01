import axios from 'axios';

export class NotificationService {
    /**
     * Send a notification via Telegram Bot API
     */
    static async sendTelegram(chatId: string, message: string) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token || !chatId) {
            // console.warn('[NotificationService] Telegram token or chatId missing');
            return;
        }

        try {
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            });
            console.log(`[NotificationService] Telegram sent to ${chatId}`);
        } catch (err: any) {
            console.error('[NotificationService] Telegram Error:', err.response?.data || err.message);
        }
    }

    /**
     * Send a notification via WhatsApp (Mock implementation for now)
     */
    static async sendWhatsApp(number: string, message: string) {
        // Here you would integrate with Twilio or another WhatsApp API provider
        console.log(`[NotificationService] MOCK WhatsApp to ${number}: ${message}`);
    }

    /**
     * Unified trigger for reply notifications
     */
    static async notifyReply(workspace: any, lead: any, campaign: any) {
        if (!workspace) return;
        if (!workspace.notifyOnReply) return;

        const message = `🚀 <b>New Reply Received!</b>\n\n` +
            `👤 <b>Lead:</b> ${lead.email}\n` +
            `📁 <b>Campaign:</b> ${campaign.name}\n\n` +
            `Check your Nexusware inbox for details.`;

        const tasks = [];
        if (workspace.telegramId) {
            tasks.push(this.sendTelegram(workspace.telegramId, message));
        }
        if (workspace.whatsappNumber) {
            tasks.push(this.sendWhatsApp(workspace.whatsappNumber, message));
        }

        await Promise.all(tasks);
    }
}
