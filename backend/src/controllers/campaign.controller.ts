import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { CampaignService } from '../services/campaign.service';

const campaignService = new CampaignService();

export class CampaignController {

    async create(req: Request, res: Response) {
        try {
            const user = (req as AuthRequest).user;
            if (!user || !user.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

            const data = { ...req.body, workspaceId: user.workspaceId };
            const campaign = await campaignService.createCampaign(data);
            res.status(201).json(campaign);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    async get(req: Request, res: Response) {
        try {
            const user = (req as AuthRequest).user;
            if (!user || !user.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

            const campaign = await campaignService.getCampaign(req.params.id as string, user.workspaceId);
            if (!campaign) return res.status(404).json({ error: "Campaign not found" });
            res.json(campaign);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    async list(req: Request, res: Response) {
        try {
            const user = (req as AuthRequest).user;
            if (!user || !user.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

            const campaigns = await campaignService.listCampaigns(user.workspaceId);
            res.json(campaigns);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    async addStep(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const step = await campaignService.addSequenceStep(id as string, req.body);
            res.status(201).json(step);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    async addLead(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { leadId } = req.body;
            const result = await campaignService.addLeadToCampaign(id as string, leadId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    async updateStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const campaign = await campaignService.updateStatus(id as string, status);
            res.json(campaign);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    async getLeads(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const leads = await campaignService.getCampaignLeads(id as string);
            res.json(leads);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }
}
