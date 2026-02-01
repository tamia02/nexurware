import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ImapService } from '../services/imap.service';

const router = Router();
const prisma = new PrismaClient();
const imapService = new ImapService();

// GET /inbox/:mailboxId/sync
// Trigger manual sync
router.post('/:mailboxId/sync', async (req, res) => {
    try {
        const { mailboxId } = req.params;
        const mailbox = await prisma.mailbox.findUnique({ where: { id: mailboxId } });
        if (!mailbox) return res.status(404).json({ error: 'Mailbox not found' });

        // Trigger Sync in background (or await?)
        // Await for UI feedback
        await imapService.syncInbox(mailbox);
        res.json({ success: true });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Failed to sync' });
    }
});

// GET /inbox/:mailboxId/threads
// List threads (grouped by Lead or just list messages)
router.get('/:mailboxId/messages', async (req, res) => {
    try {
        const { mailboxId } = req.params;
        const messages = await prisma.emailMessage.findMany({
            where: { mailboxId },
            orderBy: { receivedAt: 'desc' },
            include: { lead: true }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

export const InboxController = router;
