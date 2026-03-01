class SpintaxService {
    parse(text) {
        if (!text) return '';
        const regex = /\{([^{|}]+\|[^{}]*)\}/g;
        let result = text;
        while (result.match(regex)) {
            result = result.replace(regex, (match, content) => {
                const options = content.split('|');
                return options[0]; // Just return first for testing
            });
        }
        return result;
    }

    personalize(text, variables) {
        if (!text) return '';
        return text.replace(/\{\{\s*([\w\s_-]+)\s*\}\}/gi, (match, key) => {
            const rawKey = key.trim();
            const lowerKey = rawKey.toLowerCase();
            const foundKey = Object.keys(variables).find(k => k.toLowerCase() === lowerKey);
            if (foundKey && variables[foundKey] !== undefined && variables[foundKey] !== null) {
                return String(variables[foundKey]);
            }
            const aliasMap = {
                firstName: ['first_name', 'name', 'fname', 'first'],
                lastName: ['last_name', 'lname', 'last'],
                company: ['company_name', 'companyName', 'org', 'organization', 'business'],
                email: ['email_address', 'emailAddress', 'mail']
            };
            for (const [standardKey, aliases] of Object.entries(aliasMap)) {
                if (lowerKey === standardKey.toLowerCase() || aliases.some(a => a.toLowerCase() === lowerKey)) {
                    const keysToCheck = [standardKey, ...aliases];
                    for (const check of keysToCheck) {
                        const targetKey = Object.keys(variables).find(k => k.toLowerCase() === check.toLowerCase());
                        if (targetKey && variables[targetKey] !== undefined && variables[targetKey] !== null && variables[targetKey] !== '') {
                            return String(variables[targetKey]);
                        }
                    }
                }
            }
            const standardFields = ['firstname', 'lastname', 'company', 'email', 'name', 'first_name', 'last_name', 'company_name'];
            if (standardFields.includes(lowerKey)) return '';
            return match;
        });
    }
}

const s = new SpintaxService();
const vars = { firstName: 'John', company: '' };
console.log('Test 1 (Success):', s.personalize('Hi {{firstName}}', vars));
console.log('Test 2 (Empty/Missing):', s.personalize('From {{company}}', vars));
console.log('Test 3 (Unknown):', s.personalize('What is {{unknown}}?', vars));
console.log('Test 4 (Alias):', s.personalize('Hey {{first_name}}', vars));
console.log('Test 5 (Case):', s.personalize('Hello {{FIRSTNAME}}', vars));
