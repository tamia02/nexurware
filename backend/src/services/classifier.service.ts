
export class ClassifierService {

    static classifyReply(subject: string, body: string): string {
        const text = (subject + " " + body).toLowerCase();

        // 1. OOO Detection (High Confidence)
        const oooKeywords = [
            'automatic reply', 'out of office', 'vacation', 'auto-reply', 'away from my email',
            'limited access', 'returning on', 'contact my colleague'
        ];
        if (oooKeywords.some(kw => text.includes(kw))) {
            return 'OOO';
        }

        // 2. Negative / Unsubscribe
        const negativeKeywords = [
            'unsubscribe', 'remove me', 'not interested', 'stop emailing', 'take me off',
            'spam', 'do not contact', 'wrong person', 'no thanks', 'not for us'
        ];
        if (negativeKeywords.some(kw => text.includes(kw))) {
            return 'NEGATIVE';
        }

        // 3. Positive / Interested
        const positiveKeywords = [
            'interested', 'call', 'book a time', 'schedule', 'calendar', 'demo',
            'send more info', 'sounds good', 'let\'s talk', 'discuss further',
            'available on', 'meeting', 'pricing'
        ];
        if (positiveKeywords.some(kw => text.includes(kw))) {
            return 'POSITIVE';
        }

        // 4. Objection? (Maybe later)

        // Default
        return 'INFO'; // Information / Neutral
    }
}
