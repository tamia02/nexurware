// @ts-ignore
import { PrismaClient, Mailbox } from '@prisma/client';

const prisma = new PrismaClient();

import * as nodemailer from 'nodemailer';

export class MailboxService {

    async create(data: any): Promise<Mailbox> {
        // Enforce Limits
        if (data.workspaceId) {
            const workspace = await prisma.workspace.findUnique({ where: { id: data.workspaceId } });
            if (workspace && workspace.plan === 'FREE') {
                const count = await prisma.mailbox.count({ where: { workspaceId: data.workspaceId } });
                if (count >= 1) {
                    throw new Error('Free plan limit reached: Max 1 mailbox. Upgrade to Pro for unlimited.');
                }
            }
        }

        const createData = {
            email: data.email.toLowerCase(),
            name: data.name,
            fromName: data.fromName,
            status: 'DISCONNECTED', // Default
            smtpHost: data.smtpHost,
            smtpPort: Number(data.smtpPort),
            smtpUser: data.smtpUser,
            smtpPass: data.smtpPass,
            imapHost: data.imapHost,
            imapPort: data.imapPort ? Number(data.imapPort) : null,
            imapUser: data.imapUser,
            imapPass: data.imapPass,
            dailyLimit: Number(data.dailyLimit || 50),
            workspaceId: data.workspaceId,
            warmupEnabled: data.warmupEnabled || false,
            warmupStartedAt: data.warmupEnabled ? new Date() : null
        };

        // Check for existing mailbox (to handle previous orphans or duplicates)
        const existing = await prisma.mailbox.findUnique({ where: { email: createData.email } });
        if (existing) {
            if (!existing.workspaceId) {
                // HEAL/ADOPT: Update the orphan with current workspace
                return await prisma.mailbox.update({
                    where: { id: existing.id },
                    data: createData
                });
            } else {
                throw new Error(`Mailbox ${data.email} is already connected to a workspace.`);
            }
        }

        return await prisma.mailbox.create({
            data: createData
        });
    }

    async testConnection(data: any): Promise<{ success: boolean; message?: string }> {
        const transporter = nodemailer.createTransport({
            host: data.smtpHost,
            port: Number(data.smtpPort),
            secure: Number(data.smtpPort) === 465, // True for 465, false for other ports usually
            auth: {
                user: data.smtpUser,
                pass: data.smtpPass
            }
        });

        try {
            await transporter.verify();
            return { success: true };
        } catch (error) {
            console.error("SMTP Test Failed:", error);
            return { success: false, message: String(error) };
        }
    }

    async update(id: string, data: any) {
        // Enforce Limits on Update
        if (data.dailyLimit && Number(data.dailyLimit) > 50) {
            const mailbox = await prisma.mailbox.findUnique({ where: { id }, include: { workspace: true } });
            if (mailbox && mailbox.workspace && mailbox.workspace.plan === 'FREE') {
                throw new Error('Free plan limit reached: Max 50 emails/day. Upgrade to Pro.');
            }
        }

        return await prisma.mailbox.update({
            where: { id },
            data: {
                name: data.name,
                fromName: data.fromName,
                dailyLimit: data.dailyLimit ? Number(data.dailyLimit) : undefined,
                warmupEnabled: data.warmupEnabled,
                warmupStartedAt: data.warmupEnabled === true ? new Date() : (data.warmupEnabled === false ? null : undefined)
            }
        });
    }

    async updateStatus(id: string, status: string) {
        return await prisma.mailbox.update({ where: { id }, data: { status } });
    }

    async list(workspaceId: string): Promise<Mailbox[]> {
        return await prisma.mailbox.findMany({
            where: { workspaceId },
            orderBy: { email: 'asc' }
        });
    }

    async delete(id: string) {
        return await prisma.mailbox.delete({
            where: { id }
        });
    }
}
