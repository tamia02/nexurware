// verify-outreach.ts
import { LeadAnalysisService } from '../services/lead-analysis.service';

async function testLeadAnalysis() {
    console.log("=== Testing Lead Analysis ===");
    const service = new LeadAnalysisService();

    const emails = [
        'valid@gmail.com',
        'invalid-syntax',
        'test@mailinator.com',
        'admin@google.com' // Should have MX
    ];

    for (const email of emails) {
        const result = await service.analyzeEmail(email);
        console.log(`Email: ${email.padEnd(25)} | Risk: ${result.risk} | Score: ${result.score} | Disp: ${result.isDisposable} | MX: ${result.mxRecordsFound}`);
    }
}

function testSmartSendingLogic() {
    console.log("\n=== Testing Smart Sending Delay Logic ===");

    const dailyLimit = 50;
    // Simulate logic from scheduler
    // Gap = ~45s

    const count = 5;
    console.log(`Simulating ${count} jobs for a mailbox with daily limit ${dailyLimit}...`);

    for (let i = 0; i < count; i++) {
        const baseDelay = 45000;
        const jitter = 5000; // Fixed jitter for test
        const stagger = i * (baseDelay + jitter);

        console.log(`Job ${i + 1}: Delay ${stagger}ms (${stagger / 1000}s)`);
    }
}

async function run() {
    await testLeadAnalysis();
    testSmartSendingLogic();
}

run();
