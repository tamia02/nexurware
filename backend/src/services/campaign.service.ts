// @ts-ignore
import { PrismaClient, Campaign, Sequence } from '@prisma/client';
import { StepType, CampaignStatus } from '../enums';

const prisma = new PrismaClient();

interface CreateSequenceStepDTO {
    order: number;
    type: StepType;
    subject?: string;
    body?: string;
    delayDays?: number;
    delayHours?: number;
}

interface CreateCampaignDTO {
    name: string;
    dailyLimit?: number;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    mailboxId?: string;
    workspaceId?: string;
    scheduledAt?: string; // ISO String
    pacingInterval?: number;
}

export class CampaignService {

    /**
     * Create a new campaign with optional initial settings
     */
    async createCampaign(data: CreateCampaignDTO): Promise<Campaign> {
        return await prisma.campaign.create({
            data: {
                name: data.name,
                dailyLimit: (data.dailyLimit && !isNaN(Number(data.dailyLimit))) ? Number(data.dailyLimit) : 50,
                startTime: data.startTime,
                endTime: data.endTime,
                timezone: data.timezone,
                mailboxId: (data.mailboxId && data.mailboxId !== 'none') ? data.mailboxId : null,
                status: 'DRAFT',
                workspaceId: data.workspaceId,
                scheduledAt: (data.scheduledAt && !isNaN(Date.parse(data.scheduledAt))) ? new Date(data.scheduledAt) : new Date(),
                pacingInterval: (data.pacingInterval && !isNaN(Number(data.pacingInterval))) ? Number(data.pacingInterval) : 5
            }
        });
    }

    /**
     * Add a generic step (Email, Delay, etc.) to a campaign
     */
    async addSequenceStep(campaignId: string, stepData: CreateSequenceStepDTO): Promise<Sequence> {
        return await prisma.sequence.create({
            data: {
                campaignId,
                order: Number(stepData.order) || 0,
                type: stepData.type,
                subject: stepData.subject || '',
                body: stepData.body || '',
                delayDays: Number(stepData.delayDays) || 0,
                delayHours: Number(stepData.delayHours) || 0
            }
        });
    }

    /**
     * Link a Lead to a Campaign (Add to campaign)
     * This initializes the "State Machine" for that lead in this campaign
     */
    async addLeadToCampaign(campaignId: string, leadId: string) {
        // Check if already exists to avoid errors
        const existing = await prisma.campaignLead.findUnique({
            where: {
                campaignId_leadId: {
                    campaignId,
                    leadId
                }
            }
        });

        if (existing) return existing;

        return await prisma.campaignLead.create({
            data: {
                campaignId,
                leadId,
                status: 'NEW',
                currentStep: 0,
                nextActionAt: new Date() // Trigger immediately (or handled by scheduler)
            }
        });
    }

    async getCampaign(id: string, workspaceId: string) {
        const campaign = await prisma.campaign.findFirst({
            where: { id, workspaceId },
            include: {
                sequences: { orderBy: { order: 'asc' } },
                _count: { select: { leads: true, events: true } },
                mailbox: { select: { email: true } }
            }
        });

        if (!campaign) return null;

        const [sent, replied, bounced, positives, meetings] = await Promise.all([
            prisma.campaignLead.count({
                where: { campaignId: campaign.id, status: { in: ['SENT', 'REPLIED', 'BOUNCED'] } }
            }),
            prisma.campaignLead.count({
                where: { campaignId: campaign.id, status: 'REPLIED' }
            }),
            prisma.campaignLead.count({
                where: { campaignId: campaign.id, status: 'BOUNCED' }
            }),
            prisma.campaignLead.count({
                where: { campaignId: campaign.id, lead: { classification: 'POSITIVE' } }
            }),
            prisma.campaignLead.count({
                where: { campaignId: campaign.id, lead: { classification: 'MEETING' } }
            })
        ]);

        const openedRows = await prisma.event.groupBy({
            by: ['leadId'],
            where: { campaignId: campaign.id, type: 'EMAIL_OPENED' }
        });
        const opened = openedRows.length;

        const delivered = sent - bounced;

        return {
            ...campaign,
            stats: {
                sent,
                delivered: delivered > 0 ? delivered : 0,
                opened,
                replied,
                positives,
                meetings,
                bounced,
                bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
                openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
                replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
            }
        };
    }

    async listCampaigns(workspaceId: string) {
        const campaigns = await prisma.campaign.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { leads: true } },
                mailbox: { select: { email: true } }
            }
        });

        const results = await Promise.all(campaigns.map(async (campaign) => {
            const [sent, replied, positives, meetings, lastEvent] = await Promise.all([
                prisma.campaignLead.count({
                    where: { campaignId: campaign.id, status: { in: ['SENT', 'REPLIED', 'BOUNCED'] } }
                }),
                prisma.campaignLead.count({
                    where: { campaignId: campaign.id, status: 'REPLIED' }
                }),
                prisma.campaignLead.count({
                    where: { campaignId: campaign.id, lead: { classification: 'POSITIVE' } }
                }),
                prisma.campaignLead.count({
                    where: { campaignId: campaign.id, lead: { classification: 'MEETING' } }
                }),
                prisma.event.findFirst({
                    where: { campaignId: campaign.id },
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true }
                })
            ]);

            const openedRows = await prisma.event.groupBy({
                by: ['leadId'],
                where: { campaignId: campaign.id, type: 'EMAIL_OPENED' }
            });
            const opened = openedRows.length;

            return {
                ...campaign,
                stats: {
                    sent,
                    opened,
                    replied,
                    positives,
                    meetings,
                    openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
                    replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
                    lastActivityAt: lastEvent?.createdAt || campaign.createdAt
                }
            };
        }));

        return results;
    }

    async updateStatus(id: string, status: CampaignStatus) {
        return await prisma.campaign.update({
            where: { id },
            data: { status }
        });
    }

    async getCampaignLeads(campaignId: string) {
        const leads = await prisma.campaignLead.findMany({
            where: { campaignId },
            include: { lead: true },
            orderBy: { nextActionAt: 'asc' }
        });

        const results = await Promise.all(leads.map(async (cl) => {
            const [opens, lastEvent] = await Promise.all([
                prisma.event.count({
                    where: { campaignId, leadId: cl.leadId, type: 'EMAIL_OPENED' }
                }),
                prisma.event.findFirst({
                    where: { campaignId, leadId: cl.leadId },
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true }
                })
            ]);
            return {
                ...cl,
                opensCount: opens,
                lastActivityAt: lastEvent?.createdAt || cl.updatedAt
            };
        }));

        return results;
    }

    async cloneForNonOpeners(campaignId: string) {
        // 1. Get Original
        const original = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { sequences: true }
        });
        if (!original) throw new Error("Campaign not found");

        // 2. Find Non-Openers
        // Leads in this campaign who DO NOT have an EMAIL_OPENED event for this campaign
        const nonOpeners = await prisma.campaignLead.findMany({
            where: {
                campaignId: campaignId,
                lead: {
                    events: {
                        none: {
                            type: 'EMAIL_OPENED',
                            campaignId: campaignId
                        }
                    }
                }
            }
        });

        if (nonOpeners.length === 0) throw new Error("No non-openers found to resend to.");

        // 3. Create New Campaign
        const newCampaign = await prisma.campaign.create({
            data: {
                name: `Resend: ${original.name}`,
                status: 'DRAFT',
                workspaceId: original.workspaceId,
                mailboxId: original.mailboxId,
                dailyLimit: original.dailyLimit,
                timezone: original.timezone
            }
        });

        // 4. Clone Sequences
        for (const seq of original.sequences) {
            await prisma.sequence.create({
                data: {
                    campaignId: newCampaign.id,
                    type: seq.type,
                    order: seq.order,
                    subject: seq.subject,
                    body: seq.body,
                    delayDays: seq.delayDays,
                    delayHours: seq.delayHours,
                    condition: seq.condition
                }
            });
        }

        // 5. Add Leads
        // Bulk create might be better, but we need to init CampaignLead defaults
        await prisma.campaignLead.createMany({
            data: nonOpeners.map(cl => ({
                campaignId: newCampaign.id,
                leadId: cl.leadId,
                status: 'NEW',
                currentStep: 0,
                nextActionAt: new Date()
            }))
        });

        return newCampaign;
    }
    async deleteCampaign(id: string) {
        // Manually delete related records to ensure it works regardless of DB constraint state
        await prisma.event.deleteMany({ where: { campaignId: id } });
        await prisma.campaignLead.deleteMany({ where: { campaignId: id } });
        await prisma.sequence.deleteMany({ where: { campaignId: id } });

        return await prisma.campaign.delete({
            where: { id }
        });
    }

    async bulkDeleteCampaigns(ids: string[]) {
        // Bulk delete related records first
        await prisma.event.deleteMany({ where: { campaignId: { in: ids } } });
        await prisma.campaignLead.deleteMany({ where: { campaignId: { in: ids } } });
        await prisma.sequence.deleteMany({ where: { campaignId: { in: ids } } });

        return await prisma.campaign.deleteMany({
            where: { id: { in: ids } }
        });
    }

    async getLeadTimeline(campaignId: string, leadId: string) {
        return await prisma.event.findMany({
            where: { campaignId, leadId },
            orderBy: { createdAt: 'desc' }
        });
    }
}
