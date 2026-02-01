import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnalyticsController {

    async getCampaignStats(req: Request, res: Response) {
        try {
            const user = (req as AuthRequest).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { id } = req.params as { id: string };

            const sent = await prisma.campaignLead.count({
                where: {
                    campaignId: id,
                    status: { not: 'NEW' }
                }
            });

            const replied = await prisma.campaignLead.count({
                where: {
                    campaignId: id,
                    status: 'REPLIED'
                }
            });

            const openedRows = await prisma.event.groupBy({
                by: ['leadId'],
                where: {
                    campaignId: id,
                    type: 'EMAIL_OPENED'
                }
            });
            const opened = openedRows.length;

            const clickedRows = await prisma.event.groupBy({
                by: ['leadId'],
                where: {
                    campaignId: id,
                    type: 'LINK_CLICKED'
                }
            });
            const clicked = clickedRows.length;

            const openRate = sent > 0 ? (opened / sent) * 100 : 0;
            const replyRate = sent > 0 ? (replied / sent) * 100 : 0;
            const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;

            res.json({
                sent,
                opened,
                clicked,
                replied,
                openRate,
                replyRate,
                clickRate
            });

        } catch (error) {
            console.error('[Analytics] Error:', error);
            res.status(500).json({ error: String(error) });
        }
    }

    async getGlobalStats(req: Request, res: Response) {
        try {
            const user = (req as AuthRequest).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const totalSent = await prisma.campaignLead.count({ where: { status: { not: 'NEW' } } });
            const totalReplied = await prisma.campaignLead.count({ where: { status: 'REPLIED' } });

            const uniqueOpens = await prisma.event.groupBy({
                by: ['leadId'],
                where: { type: 'EMAIL_OPENED' }
            });
            const totalOpened = uniqueOpens.length;

            const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
            const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

            res.json({ totalSent, totalOpened, totalReplied, openRate, replyRate });
        } catch (error) {
            console.error('[Analytics] Error:', error);
            res.status(500).json({ error: String(error) });
        }
    }

    async getDailyStats(req: Request, res: Response) {
        try {
            const user = (req as AuthRequest).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const dailyStats = await prisma.$queryRaw`
                SELECT 
                    DATE_TRUNC('day', "createdAt") as date,
                    COUNT(*) FILTER (WHERE type = 'EMAIL_SENT') as sent,
                    COUNT(*) FILTER (WHERE type = 'EMAIL_OPENED') as opened,
                    COUNT(*) FILTER (WHERE type = 'EMAIL_REPLIED') as replied
                FROM "Event"
                GROUP BY date
                ORDER BY date DESC
                LIMIT 30;
            `;

            const formatted = (dailyStats as any[]).map(d => ({
                date: d.date,
                sent: Number(d.sent),
                opened: Number(d.opened),
                replied: Number(d.replied)
            }));

            res.json(formatted);
        } catch (error) {
            console.error('[Analytics] Error:', error);
            res.status(500).json({ error: String(error) });
        }
    }
}
