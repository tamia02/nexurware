
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// Hardcoded secret for now (simple MVP). In production, use process.env.ADMIN_SECRET
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'tasmi-admin-secret';

export const checkAdminSecret = (req: Request, res: Response, next: NextFunction) => {
    const secret = req.headers['x-admin-secret'];
    if (secret !== ADMIN_SECRET) {
        return res.status(403).json({ error: 'Unauthorized: Invalid Admin Secret' });
    }
    next();
};

export const getWorkspaces = async (req: Request, res: Response) => {
    try {
        const workspaces = await prisma.workspace.findMany({
            include: { _count: { select: { users: true, mailboxes: true, campaigns: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(workspaces);
    } catch (error) {
        console.error('Get workspaces error:', error);
        res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
};

export const upgradeWorkspace = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        const workspace = await prisma.workspace.update({
            where: { id },
            data: { plan: 'PRO' }
        });
        res.json(workspace);
    } catch (error) {
        console.error('Upgrade workspace error:', error);
        res.status(500).json({ error: 'Failed to upgrade workspace' });
    }
};

export const downgradeWorkspace = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        const workspace = await prisma.workspace.update({
            where: { id },
            data: { plan: 'FREE' }
        });
        res.json(workspace);
    } catch (error) {
        console.error('Downgrade workspace error:', error);
        res.status(500).json({ error: 'Failed to downgrade workspace' });
    }
};

export const deleteWorkspace = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Delete Events
            await tx.event.deleteMany({ where: { campaign: { workspaceId: id } } });
            await tx.event.deleteMany({ where: { lead: { workspaceId: id } } });

            // 2. Delete EmailMessages
            await tx.emailMessage.deleteMany({ where: { mailbox: { workspaceId: id } } });

            // 3. Delete Sequences (Cascaded by Campaign but manual is safer)
            await tx.sequence.deleteMany({ where: { campaign: { workspaceId: id } } });

            // 4. Delete CampaignLeads
            await tx.campaignLead.deleteMany({ where: { campaign: { workspaceId: id } } });

            // 5. Delete Campaigns
            await tx.campaign.deleteMany({ where: { workspaceId: id } });

            // 6. Delete Leads
            await tx.lead.deleteMany({ where: { workspaceId: id } });

            // 7. Delete Mailboxes
            await tx.mailbox.deleteMany({ where: { workspaceId: id } });

            // 8. Delete Users
            await tx.user.deleteMany({ where: { workspaceId: id } });

            // 9. Delete Workspace
            await tx.workspace.delete({ where: { id } });
        });

        res.json({ message: 'Workspace and all associated data deleted successfully' });
    } catch (error) {
        console.error('Delete workspace error:', error);
        res.status(500).json({ error: 'Failed to delete workspace' });
    }
};
