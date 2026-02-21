const { SpintaxService } = require('./backend/src/services/spintax.service');
const spintaxService = new SpintaxService();

const leadMetadata = {
    firstName: 'Alice',
    company: 'Wonderland Inc',
    customSubject: 'Personal question for Alice',
    customMessage: 'I really like your work at Wonderland!'
};

const templates = [
    { subject: '{{customSubject}}', body: 'Hi {{firstName}}, {{customMessage}}' },
    { subject: 'Quick question for {{company}}', body: 'Hey, {{customMessage}}' }
];

templates.forEach((t, i) => {
    const s = spintaxService.personalize(spintaxService.parse(t.subject), leadMetadata);
    const b = spintaxService.personalize(spintaxService.parse(t.body), leadMetadata);
    console.log(`--- Template ${i + 1} ---`);
    console.log(`Subject: ${s}`);
    console.log(`Body: ${b}`);
});
