export interface QualityResult {
    score: number;
    warnings: string[];
    suggestions: string[];
}

const SPAM_TRIGGERS = [
    'free', 'guarantee', 'winner', 'risk-free', 'special promotion', 'act now',
    'apply now', 'exclusive deal', 'limited time', '100% free', '$$$', 'buy now'
];

export const analyzeCampaign = (steps: any[]): QualityResult => {
    let score = 100;
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (steps.length === 0) return { score: 0, warnings: [], suggestions: [] };

    // 1. Analyze Subject Lines
    steps.forEach((step, idx) => {
        if (step.type !== 'EMAIL') return;

        const subject = step.subject || '';
        const body = step.body || '';

        // Check Subject Length
        if (subject.length > 60) {
            score -= 5;
            warnings.push(`Step ${idx + 1}: Subject line is too long (>60 chars). Short subjects get better open rates.`);
        }
        if (subject === subject.toUpperCase() && subject.length > 0) {
            score -= 10;
            warnings.push(`Step ${idx + 1}: Subject line is ALL CAPS. This triggers spam filters.`);
        }

        // Check Spam Words
        SPAM_TRIGGERS.forEach(word => {
            if (subject.toLowerCase().includes(word)) {
                score -= 5;
                warnings.push(`Step ${idx + 1}: Subject contains spam trigger word "${word}".`);
            }
            if (body.toLowerCase().includes(word)) {
                score -= 2; // Less penalty for body
                warnings.push(`Step ${idx + 1}: Body contains spam trigger word "${word}".`);
            }
        });

        // Check Links
        const linkCount = (body.match(/http/g) || []).length;
        if (linkCount > 2) {
            score -= 5;
            warnings.push(`Step ${idx + 1}: Too many links (${linkCount}). Keep it under 2 to avoid spam folders.`);
        }

        // Check Personalization
        if (!body.includes('{{') && !subject.includes('{{')) {
            suggestions.push(`Step ${idx + 1}: Consider adding personalization tags like {{firstName}} to increase engagement.`);
        }
    });

    // 2. Sequence Structure
    if (steps.filter(s => s.type === 'EMAIL').length < 2) {
        score -= 10;
        suggestions.push("Campaigns with at least 1 follow-up usually double the reply rate.");
    }

    return {
        score: Math.max(0, score),
        warnings,
        suggestions
    };
};
