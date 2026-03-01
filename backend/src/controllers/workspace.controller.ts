import { Request, Response } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { StripeService } from '../services/stripe.service';

const prisma = new PrismaClient();
const stripeService = new StripeService();

export class WorkspaceController {

    async get(req: Request, res: Response) {
        try {
            const user = (req as AuthRequest).user;
            if (!user || !user.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

            const workspace = await prisma.workspace.findUnique({
                where: { id: user.workspaceId }
            });

            res.json(workspace);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    // Initiate Stripe Checkout
    async createCheckoutSession(req: Request, res: Response) {
        try {
            const user = (req as AuthRequest).user;
            if (!user || !user.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

            const session = await stripeService.createCheckoutSession(user.workspaceId, user.email);
            res.json(session);
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    // Dev only: Manual upgrade
    async devUpgrade(req: Request, res: Response) {
        try {
            const user = (req as AuthRequest).user;
            if (!user || !user.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

            await stripeService.upgradeDev(user.workspaceId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const user = (req as AuthRequest).user;
            if (!user || !user.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

            const workspace = await prisma.workspace.update({
                where: { id: user.workspaceId },
                data: req.body
            });

            res.json(workspace);
        } catch (error) {
            console.error('[WorkspaceController] Update Error:', error);
            res.status(500).json({ error: String(error) });
        }
    }
}
