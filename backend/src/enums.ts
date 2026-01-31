export const LeadStatus = {
    NEW: 'NEW',
    CONTACTED: 'CONTACTED',
    QUEUED: 'QUEUED',
    REPLIED: 'REPLIED',
    BOOKED: 'BOOKED',
    BOUNCED: 'BOUNCED',
    UNSUBSCRIBED: 'UNSUBSCRIBED',
    IGNORED: 'IGNORED',
    INVALID: 'INVALID',
    FAILED: 'FAILED'
} as const;

export type LeadStatus = keyof typeof LeadStatus;

export const CampaignStatus = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    ARCHIVED: 'ARCHIVED'
} as const;

export type CampaignStatus = keyof typeof CampaignStatus;

export const EventType = {
    EMAIL_SENT: 'EMAIL_SENT',
    EMAIL_OPENED: 'EMAIL_OPENED',
    LINK_CLICKED: 'LINK_CLICKED',
    REPLY_RECEIVED: 'REPLY_RECEIVED',
    BOUNCED: 'BOUNCED',
    BOOKED: 'BOOKED',
    EMAIL_FAILED: 'EMAIL_FAILED'
} as const;

export type EventType = keyof typeof EventType;

export const StepType = {
    EMAIL: 'EMAIL',
    TASK_MANUAL: 'TASK_MANUAL'
} as const;

export type StepType = keyof typeof StepType;
