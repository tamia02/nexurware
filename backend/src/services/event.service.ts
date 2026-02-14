import { PrismaClient } from '@prisma/client';
import { EventType } from '../enums';

const prisma = new PrismaClient();

export class EventService {

    async logEvent(
        type: EventType,
        campaignId: string | null,
        leadId: string | null,
        sequenceId: string | null = null,
        metadata: any = {}
    ) {
        return await prisma.event.create({
            data: {
                type,
                campaignId,
                leadId,
                sequenceId,
                metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata || {}),
            }
        });
    }

    async getStats(campaignId?: string) {
        // Aggregation handling
        const where = campaignId ? { campaignId } : {};

        const [sent, opened, clicked, replied, bounced] = await Promise.all([
            prisma.event.count({ where: { ...where, type: 'EMAIL_SENT' } }),
            prisma.event.count({ where: { ...where, type: 'EMAIL_OPENED' } }),
            prisma.event.count({ where: { ...where, type: 'LINK_CLICKED' } }),
            prisma.event.count({ where: { ...where, type: 'REPLY_RECEIVED' } }),
            prisma.event.count({ where: { ...where, type: 'BOUNCED' } }),
        ]);

        return {
            sent,
            opened,
            clicked,
            replied,
            bounced,
            openRate: sent > 0 ? (opened / sent) * 100 : 0,
            replyRate: sent > 0 ? (replied / sent) * 100 : 0
        };
    }
}
