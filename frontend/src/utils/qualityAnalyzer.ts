
export interface QualityResult {
    score: number;
    warnings: string[];
    suggestions: string[];
}

// Removed import to avoid circular dependency
export interface Step {
    type: 'EMAIL' | 'DELAY';
    subject?: string;
    body?: string;
    previewText?: string;
}

export function analyzeCampaign(sequences: Step[]): QualityResult {
    let score = 100;
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (sequences.length === 0) {
        return { score: 0, warnings: ["Add at least one email step."], suggestions: [] };
    }

    sequences.forEach((step, index) => {
        if (step.type === 'EMAIL') {
            const subject = step.subject || '';
            const body = step.body || '';
            const previewText = step.previewText || '';
            const wordCount = body.trim().split(/\s+/).length;
            const linkCount = (body.match(/http/g) || []).length;

            // 1. Subject Length
            if (subject.length > 60) {
                score -= 5;
                warnings.push(`Step ${index + 1}: Subject line is too long (${subject.length} chars). Keep it under 50-60 chars.`);
            } else if (subject.length < 10 && subject.length > 0) {
                suggestions.push(`Step ${index + 1}: Subject line might be too short to be descriptive.`);
            }

            // 2. Preview Text
            if (!previewText) {
                score -= 10;
                warnings.push(`Step ${index + 1}: Missing preview text. This is crucial for open rates.`);
            }

            // 3. Word Count (Single Idea Rule)
            if (wordCount > 200) {
                score -= 10;
                warnings.push(`Step ${index + 1}: Email is too long (${wordCount} words). Aim for under 150 words to focus on a single idea.`);
            } else if (wordCount > 150) {
                suggestions.push(`Step ${index + 1}: Consider shortening your email to under 150 words.`);
            }

            // 4. Link Count
            if (linkCount > 2) {
                score -= 5;
                warnings.push(`Step ${index + 1}: Too many links (${linkCount}). Use max 1-2 calls to action.`);
            }

            // 5. Spam Words (Basic Check)
            const spamWords = ['buy now', 'free', 'guarantee', 'urgent', 'winner', 'million dollars'];
            spamWords.forEach(word => {
                if (body.toLowerCase().includes(word) || subject.toLowerCase().includes(word)) {
                    score -= 5;
                    warnings.push(`Step ${index + 1}: Contains potential spam trigger word: "${word}".`);
                }
            });

            // 6. PS Check
            if (!body.toLowerCase().includes("ps:") && !body.toLowerCase().includes("p.s.")) {
                suggestions.push(`Step ${index + 1}: Consider adding a P.S. line. It's often the second most read part of an email.`);
            }

        }
    });

    return {
        score: Math.max(0, score),
        warnings,
        suggestions
    };
}
