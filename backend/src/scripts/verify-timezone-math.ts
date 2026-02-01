import { formatInTimeZone } from 'date-fns-tz';

const testCases = [
    { zone: 'America/New_York', nowUTC: '2023-10-27T14:00:00Z', expectedHour: 10 }, // 10AM
    { zone: 'Asia/Tokyo', nowUTC: '2023-10-27T14:00:00Z', expectedHour: 23 }, // 11PM
    { zone: 'Australia/Sydney', nowUTC: '2023-10-27T14:00:00Z', expectedHour: 1 } // 1AM next day (AEDT UTC+11)
];

console.log('Verifying Timezone Math...');

let failed = false;
for (const t of testCases) {
    const now = new Date(t.nowUTC);
    const hour = parseInt(formatInTimeZone(now, t.zone, 'HH'));
    console.log(`Zone: ${t.zone}, UTC: ${t.nowUTC}, LocalHour: ${hour}, Expected: ${t.expectedHour}`);
    if (hour !== t.expectedHour) {
        console.error('FAIL');
        failed = true;
    } else {
        console.log('PASS');
    }
}

if (failed) process.exit(1);
