// verify-warmup-logic.ts

function calculateDailyLimit(startStr: string) {
    const now = new Date(); // Current time
    const start = new Date(startStr);

    // Logic from WarmupService
    const daysRunning = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyTarget = Math.min(50, 5 + (daysRunning * 2));

    return { daysRunning, dailyTarget };
}

console.log("=== Testing Warmup Ramp Up Logic ===");

const cases = [
    { name: "Just Started", date: new Date().toISOString() },
    { name: "1 Day Ago", date: new Date(Date.now() - 86400000).toISOString() },
    { name: "5 Days Ago", date: new Date(Date.now() - 86400000 * 5).toISOString() },
    { name: "10 Days Ago", date: new Date(Date.now() - 86400000 * 10).toISOString() },
    { name: "30 Days Ago", date: new Date(Date.now() - 86400000 * 30).toISOString() }
];

cases.forEach(c => {
    const res = calculateDailyLimit(c.date);
    console.log(`- ${c.name}: Days=${res.daysRunning}, Limit=${res.dailyTarget}`);
});
