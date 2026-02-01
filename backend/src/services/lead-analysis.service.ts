import { promises as dns } from 'dns';

export interface LeadAnalysisResult {
    email: string;
    validSyntax: boolean;
    isDisposable: boolean;
    mxRecordsFound: boolean;
    score: number; // 0-100
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class LeadAnalysisService {

    private disposableDomains = new Set([
        'mailinator.com', 'yopmail.com', 'temp-mail.org', 'guerrillamail.com',
        '10minutemail.com', 'sharklasers.com', 'throwawaymail.com'
    ]);

    async analyzeEmail(email: string): Promise<LeadAnalysisResult> {
        const result: LeadAnalysisResult = {
            email,
            validSyntax: false,
            isDisposable: false,
            mxRecordsFound: false,
            score: 0,
            risk: 'HIGH'
        };

        // 1. Syntax Check
        const syntaxRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!syntaxRegex.test(email)) {
            return result; // Early exit
        }
        result.validSyntax = true;
        result.score = 30;

        const [local, domain] = email.split('@');

        // 2. Disposable Check
        if (this.disposableDomains.has(domain.toLowerCase())) {
            result.isDisposable = true;
            result.risk = 'HIGH';
            result.score = 10;
            return result;
        }
        result.score += 20; // Up to 50

        // 3. MX Record Check
        try {
            const mxRecords = await dns.resolveMx(domain);
            if (mxRecords && mxRecords.length > 0) {
                result.mxRecordsFound = true;
                result.score += 50; // Up to 100
            }
        } catch (error) {
            // DNS error or no MX records
            result.mxRecordsFound = false;
        }

        // Final Risk Assessment
        if (result.validSyntax && !result.isDisposable && result.mxRecordsFound) {
            result.risk = 'LOW';
        } else if (result.validSyntax && !result.isDisposable && !result.mxRecordsFound) {
            result.risk = 'MEDIUM'; // Could be valid but domain has issues?
        } else {
            result.risk = 'HIGH';
        }

        return result;
    }
}
