import * as net from 'net';

const targets = [
    { host: 'smtp.gmail.com', port: 587 },
    { host: 'smtp.gmail.com', port: 465 },
    { host: 'smtp.office365.com', port: 587 },
    { host: 'smtp.mail.yahoo.com', port: 465 }
];

async function test(host: string, port: number) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 5000;

        socket.setTimeout(timeout);

        console.log(`Testing ${host}:${port}...`);

        socket.connect(port, host, () => {
            console.log(`✅ ${host}:${port} - CONNECTED`);
            socket.destroy();
            resolve(true);
        });

        socket.on('error', (err) => {
            console.log(`❌ ${host}:${port} - FAILED (${err.message})`);
            resolve(false);
        });

        socket.on('timeout', () => {
            console.log(`❌ ${host}:${port} - TIMEOUT`);
            socket.destroy();
            resolve(false);
        });
    });
}

async function runTests() {
    for (const target of targets) {
        await test(target.host, target.port);
    }
}

runTests();
