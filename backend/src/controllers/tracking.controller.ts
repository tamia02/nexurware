import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export class TrackingController {

    /**
     * Track Email Open
     * GET /track/open?id=<campaignLeadId>
     */
    static async trackOpen(req: Request, res: Response) {
        try {
            const { id } = req.query; // campaignLeadId or eventId? 
            // Better to use a specific Tracking ID or just the CampaignLead ID if unique per email sent
            // But CampaignLead ID is constant across steps? 
            // For now, let's assume 'id' is CampaignLead ID.

            if (id && typeof id === 'string') {
                // Log Event
                await prisma.event.create({
                    data: {
                        type: 'EMAIL_OPENED',
                        metadata: JSON.stringify({ ip: req.ip, userAgent: req.headers['user-agent'] }),
                        // We need lookup to find campaignId/leadId from the passed ID
                        // If ID passed is CampaignLeadId:
                        // campaignId: ..., leadId: ...
                    }
                });

                // Wait, creating event requires linking to Campaign/Lead.
                // Fetch CampaignLead first
                const cl = await prisma.campaignLead.findUnique({
                    where: { id: id },
                    include: { campaign: true, lead: true }
                });

                if (cl) {
                    await prisma.event.create({
                        data: {
                            type: 'EMAIL_OPENED',
                            campaignId: cl.campaignId,
                            leadId: cl.leadId,
                            sequenceId: (req.query.step as string) || null,
                            metadata: JSON.stringify({ ip: req.ip, ua: req.get('User-Agent') })
                        }
                    });
                    // console.log(`[Tracking] Email Opened: ${cl.lead.email}`);
                }
            }
        } catch (error) {
            console.error('[Tracking] Error logging open:', error);
        }

        // Always return the pixel
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': PIXEL.length,
        });
        res.end(PIXEL);
    }

    /**
     * Track Link Click
     * GET /track/click?url=<dest>&id=<campaignLeadId>
     */
    static async trackClick(req: Request, res: Response) {
        const { url, id } = req.query;

        if (!url || typeof url !== 'string') {
            return res.status(400).send('Missing URL');
        }

        try {
            if (id && typeof id === 'string') {
                const cl = await prisma.campaignLead.findUnique({ where: { id: id } });
                if (cl) {
                    await prisma.event.create({
                        data: {
                            type: 'LINK_CLICKED',
                            campaignId: cl.campaignId,
                            leadId: cl.leadId,
                            sequenceId: (req.query.step as string) || null,
                            metadata: JSON.stringify({ url, ip: req.ip, ua: req.get('User-Agent') })
                        }
                    });
                    // console.log(`[Tracking] Link Clicked: ${url}`);
                }
            }
        } catch (error) {
            console.error('[Tracking] Error logging click:', error);
        }

        // Redirect
        res.redirect(url);
    }
}
