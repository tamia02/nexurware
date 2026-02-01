import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ImapService {

    private connect(mailbox: any): Promise<Imap> {
        return new Promise((resolve, reject) => {
            const imap = new Imap({
                user: mailbox.email,
                password: mailbox.appPassword || mailbox.password,
                host: mailbox.imapHost || 'imap.gmail.com',
                port: mailbox.imapPort || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 3000
            });

            imap.once('ready', () => resolve(imap));
            imap.once('error', (err: any) => reject(err));
            imap.end();
            imap.connect();
        });
    }

    private async getImapConnection(mailbox: any): Promise<Imap> {
        return new Promise((resolve, reject) => {
            const imap = new Imap({
                user: mailbox.email,
                password: mailbox.appPassword || mailbox.password,
                host: mailbox.imapHost || 'imap.gmail.com',
                port: mailbox.imapPort || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            });

            imap.once('ready', () => resolve(imap));
            imap.once('error', (err: any) => reject(err));
            imap.connect();
        });
    }

    async checkReplies(mailbox: any): Promise<string[]> {
        return [];
    }

    async checkBounces(mailbox: any): Promise<string[]> {
        return new Promise(async (resolve, reject) => {
            let imap: Imap;
            try {
                imap = await this.getImapConnection(mailbox);
            } catch (err) {
                console.error(`[IMAP] Connection failed for ${mailbox.email}:`, err);
                return resolve([]);
            }

            imap.openBox('INBOX', true, (err: any, box: any) => {
                if (err) {
                    imap.end();
                    return resolve([]);
                }

                imap.search([['FROM', 'mailer-daemon']], (err: any, results: number[]) => {
                    if (err || !results || results.length === 0) {
                        imap.end();
                        return resolve([]);
                    }

                    const fetch = imap.fetch(results, { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true });
                    const bouncedEmails: string[] = [];

                    fetch.on('message', (msg: any) => {
                        msg.on('body', (stream: any) => {
                            simpleParser(stream, async (err, parsed) => {
                                console.log(`[Bounce] Found bounce: ${parsed.subject}`);
                            });
                        });
                    });

                    fetch.once('error', (err: any) => {
                        console.error('[IMAP] Fetch received error: ' + err);
                    });

                    fetch.once('end', () => {
                        imap.end();
                        resolve(bouncedEmails);
                    });
                });
            });
        });
    }

    async syncInbox(mailbox: any, limit: number = 20): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let imap: Imap;
            try {
                imap = await this.getImapConnection(mailbox);
            } catch (err) {
                console.error(`[IMAP] Connection failed for ${mailbox.email}:`, err);
                return resolve();
            }

            imap.openBox('INBOX', false, (err: any, box: any) => {
                if (err) {
                    imap.end();
                    return resolve();
                }

                const total = box.messages.total;
                const start = Math.max(1, total - limit + 1);

                if (total === 0) {
                    imap.end();
                    return resolve();
                }

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

                            const lead = await prisma.lead.findFirst({ where: { email: fromEmail } });

                            try {
                                await prisma.emailMessage.upsert({
                                    where: { mailboxId_remoteId: { mailboxId: mailbox.id, remoteId: String(uid || seqno) } },
                                    update: {},
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
                    imap.end();
                    resolve();
                });
            });
        });
    }
}
