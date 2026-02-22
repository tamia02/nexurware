import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { PrismaClient } from '@prisma/client';
import { ClassifierService } from './classifier.service';

const prisma = new PrismaClient();

export class ImapService {
    // Static map to hold active connections across service instances
    private static connections: Map<string, Imap> = new Map();

    /**
     * Get an existing connection or create a new one.
     */
    private async getConnection(mailbox: any): Promise<Imap> {
        if (ImapService.connections.has(mailbox.id)) {
            const existing = ImapService.connections.get(mailbox.id);
            if (existing && existing.state === 'authenticated') {
                // console.log(`[IMAP] Reusing connection for ${mailbox.email}`);
                return existing;
            }
            // If state is not authenticated/connected, remove it and reconnect
            ImapService.connections.delete(mailbox.id);
        }

        return new Promise((resolve, reject) => {
            console.log(`[IMAP] Creating new connection for ${mailbox.email}`);
            const imap = new Imap({
                user: mailbox.email,
                password: mailbox.appPassword || mailbox.password,
                host: mailbox.imapHost || 'imap.gmail.com',
                port: mailbox.imapPort || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 10000,
                connTimeout: 10000
            });

            imap.once('ready', () => {
                ImapService.connections.set(mailbox.id, imap);
                resolve(imap);
            });

            imap.once('error', (err: any) => {
                console.error(`[IMAP] Connection Error (${mailbox.email}):`, err);
                ImapService.connections.delete(mailbox.id);
                // Only reject if it's the initial connection attempt
                if (imap.state !== 'authenticated') {
                    reject(err);
                }
            });

            imap.once('end', () => {
                ImapService.connections.delete(mailbox.id);
            });

            imap.connect();
        });
    }

    // Helper to safely close connection if needed (e.g. on mailbox delete)
    public static closeConnection(mailboxId: string) {
        const imap = ImapService.connections.get(mailboxId);
        if (imap) {
            imap.end();
            ImapService.connections.delete(mailboxId);
        }
    }

    async syncInbox(mailbox: any, limit: number = 20): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let imap: Imap;
            try {
                imap = await this.getConnection(mailbox);
            } catch (err) {
                console.error(`[IMAP] Connection failed for ${mailbox.email}:`, err);
                return resolve();
            }

            imap.openBox('INBOX', false, (err: any, box: any) => {
                if (err) {
                    console.error('[IMAP] OpenBox Error:', err);
                    // Do not end() here if reusing, but maybe we should if box fails?
                    // Safe to just return.
                    return resolve();
                }

                const total = box.messages.total;
                if (total === 0) return resolve();

                const start = Math.max(1, total - limit + 1);

                // Fetch header + body structure first
                const fetch = imap.seq.fetch(`${start}:*`, { bodies: '', struct: true });

                fetch.on('message', (msg: any, seqno: number) => {
                    let uid = '';
                    let date = new Date();

                    msg.once('attributes', (attrs: any) => {
                        uid = String(attrs.uid);
                        date = attrs.date;
                    });

                    msg.on('body', (stream: any) => {
                        simpleParser(stream, async (err, parsed) => {
                            if (err) return;

                            const fromEmail = parsed.from?.value?.[0]?.address || '';
                            const toEmail = (parsed.to as any)?.value?.[0]?.address || (parsed.to as any)?.text || '';
                            const subject = parsed.subject || '(No Subject)';
                            const body = parsed.text || '';
                            const htmlBody = parsed.html || '';

                            // Use upsert to avoid duplicates
                            const lead = await prisma.lead.findFirst({ where: { email: fromEmail } });

                            let classification = 'INFO';
                            if (lead) {
                                classification = ClassifierService.classifyReply(subject, body || '');

                                // Update Lead Status based on Classification
                                if (classification === 'POSITIVE' || classification === 'NEGATIVE' || classification === 'OOO') {
                                    // Only update if not already handled? Or always update latest sentiment?
                                    // Let's update classification field always.
                                    // And status to REPLIED if not already.
                                    await prisma.lead.update({
                                        where: { id: lead.id },
                                        data: {
                                            classification: classification,
                                            status: 'REPLIED'
                                        }
                                    });
                                }
                            }

                            try {
                                await prisma.emailMessage.upsert({
                                    where: { mailboxId_remoteId: { mailboxId: mailbox.id, remoteId: String(uid || seqno) } },
                                    update: {}, // exists, do nothing
                                    create: {
                                        mailboxId: mailbox.id,
                                        leadId: lead?.id,
                                        remoteId: String(uid || seqno),
                                        subject: subject.substring(0, 200),
                                        body: body,
                                        htmlBody: htmlBody,
                                        fromEmail,
                                        toEmail,
                                        receivedAt: date,
                                        isRead: false
                                    }
                                });
                            } catch (e) {
                                console.error('[Sync] Error saving email:', e);
                            }
                        });
                    });
                });

                fetch.once('end', () => {
                    resolve();
                });
            });
        });
    }

    // ... (Keep existing checkBounces / checkReplies logic but update them to use getConnection if needed) ...
    // For brevity, I'll include minimal stubs or they should remain if user calls them.
    // I will disable them for now or implement similarly.

    async checkReplies(mailbox: any): Promise<string[]> {
        return new Promise(async (resolve, reject) => {
            let imap: Imap;
            try {
                imap = await this.getConnection(mailbox);
            } catch (err) {
                console.error(`[IMAP] Connection failed for ${mailbox.email}:`, err);
                return resolve([]);
            }

            imap.openBox('INBOX', false, (err: any, box: any) => {
                if (err) {
                    console.error('[IMAP] OpenBox Error:', err);
                    return resolve([]);
                }

                // Search for UNSEEN messages from the last 24 hours
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                imap.search(['UNSEEN', ['SINCE', yesterday]], (err, results) => {
                    if (err || !results || results.length === 0) return resolve([]);

                    const f = imap.fetch(results, { bodies: 'HEADER.FIELDS (FROM)', struct: true });
                    const senders: string[] = [];

                    f.on('message', (msg) => {
                        msg.on('body', (stream) => {
                            simpleParser(stream, async (err, parsed) => {
                                if (err) return;
                                if (parsed.from?.value?.[0]?.address) {
                                    senders.push(parsed.from.value[0].address);
                                }
                            });
                        });
                    });

                    f.once('end', () => {
                        resolve(senders);
                    });
                });
            });
        });
    }

    async checkBounces(mailbox: any) {
        // Basic implementation to flag bounces - looking for Mailer-Daemon
        return new Promise(async (resolve) => {
            let imap: Imap;
            try {
                imap = await this.getConnection(mailbox);
            } catch (err) {
                return resolve([]);
            }

            imap.openBox('INBOX', false, (err) => {
                if (err) return resolve([]);

                imap.search([['FROM', 'mailer-daemon']], (err, results) => {
                    if (err || !results || results.length === 0) return resolve([]);
                    // Logic to process bounces could be added here
                    resolve(results);
                });
            });
        });
    }
}
