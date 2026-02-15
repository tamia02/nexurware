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
}

export class CampaignService {

    /**
     * Create a new campaign with optional initial settings
     */
    async createCampaign(data: CreateCampaignDTO): Promise<Campaign> {
        return await prisma.campaign.create({
            data: {
                name: data.name,
                dailyLimit: data.dailyLimit,
                startTime: data.startTime,
                endTime: data.endTime,
                timezone: data.timezone,
                mailboxId: data.mailboxId,
                status: 'DRAFT',
                workspaceId: data.workspaceId
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
                order: stepData.order,
                type: stepData.type,
                subject: stepData.subject,
                body: stepData.body, // In real app, validate spintax here
                delayDays: stepData.delayDays || 0,
                delayHours: stepData.delayHours || 0
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
        return await prisma.campaign.findFirst({
            where: { id, workspaceId },
            include: {
                sequences: { orderBy: { order: 'asc' } },
                _count: { select: { leads: true, events: true } }
            }
        });
    }

    async listCampaigns(workspaceId: string) {
        return await prisma.campaign.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { leads: true } }
            }
        });
    }

    async updateStatus(id: string, status: CampaignStatus) {
        return await prisma.campaign.update({
            where: { id },
            data: { status }
        });
    }

    async getCampaignLeads(campaignId: string) {
        return await prisma.campaignLead.findMany({
            where: { campaignId },
            include: { lead: true },
            orderBy: { nextActionAt: 'asc' }
        });
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
}
