import express from 'express';
import './workers/email.worker'; // Start the Queue Worker
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import leadRouter from './routes/lead.routes';
import campaignRouter from './routes/campaign.routes';
import trackingRouter from './routes/tracking.routes';
import webhookRouter from './routes/webhook.routes';
import analyticsRouter from './routes/analytics.routes';
import { SchedulerService } from './services/scheduler.service';
import mailboxRouter from './routes/mailbox.routes';
import authRouter from './routes/auth.routes';
import { OnboardingController } from './controllers/onboarding.controller';
import workspaceRouter from './routes/workspace.routes';
import widgetRouter from './routes/widget.routes';
import adminRouter from './routes/admin.routes';
import { InboxController } from './controllers/inbox.controller';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

import { apiLimiter } from './middleware/rate-limit.middleware';
app.use('/api/', apiLimiter);

import { authenticate } from './middleware/auth.middleware';

app.use('/api/auth', authRouter);
app.use('/api/leads', authenticate, leadRouter);
app.use('/api/campaigns', authenticate, campaignRouter);
app.use('/api/analytics', authenticate, analyticsRouter);
app.get('/api/onboarding', authenticate, new OnboardingController().getStatus);
app.use('/api/workspace', authenticate, workspaceRouter);
app.use('/tracking', trackingRouter);
app.use('/webhooks', webhookRouter);
app.use('/api/mailboxes', authenticate, mailboxRouter);
app.use('/api/widget', widgetRouter);
app.use('/api/admin', adminRouter);
app.use('/api/inbox', authenticate, InboxController);

// Health Check
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'ok',
            db: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            db: 'disconnected',
            error: String(error)
        });
    }
});

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);

    // background worker
    const scheduler = new SchedulerService();
    console.log('[Worker] Starting polling service...');
    setInterval(async () => {
        try {
            await scheduler.pollForEligibleLeads();
            await scheduler.pollForReplies();
        } catch (err) {
            console.error('[Worker] Error polling:', err);
        }
    }, 60000); // Poll every minute
});
