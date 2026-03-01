export class SpintaxService {

    /**
     * Parses nested spintax like "{Hi|Hello|{Hey|Greetings}}"
     * Only replaces if a pipe | exists to avoid stripping {{tags}}
     */
    parse(text: string): string {
        if (!text) return '';

        // Only match brackets that contain a pipe |
        const regex = /\{([^{|}]+\|[^{}]*)\}/g;
        let result = text;

        while (result.match(regex)) {
            result = result.replace(regex, (match, content) => {
                const options = content.split('|');
                const randomOption = options[Math.floor(Math.random() * options.length)];
                return randomOption;
            });
        }

        return result;
    }

    /**
     * Replaces variables like {{firstName}} with actual data
     * Uses a single pass with a global regex for efficiency and case-insensitivity
     */
    personalize(text: string, variables: Record<string, any>): string {
        if (!text) return '';

        // Regex to find all {{ key }} occurrences
        return text.replace(/\{\{\s*([\w\s_-]+)\s*\}\}/gi, (match, key) => {
            const trimmedKey = key.trim();

            // 1. Precise Match
            if (variables[trimmedKey] !== undefined && variables[trimmedKey] !== null) {
                return String(variables[trimmedKey]);
            }

            // 2. Case-insensitive lookup (Robustness)
            const foundKey = Object.keys(variables).find(
                k => k.toLowerCase() === trimmedKey.toLowerCase()
            );

            if (foundKey && variables[foundKey] !== undefined && variables[foundKey] !== null) {
                return String(variables[foundKey]);
            }

            // 3. Common Aliases (Fallback)
            const aliases: Record<string, string[]> = {
                firstName: ['first_name', 'name', 'fname'],
                lastName: ['last_name', 'lname'],
                company: ['company_name', 'companyName', 'org', 'organization'],
                email: ['email_address', 'emailAddress', 'mail']
            };

            for (const [standardKey, aliasList] of Object.entries(aliases)) {
                if (trimmedKey.toLowerCase() === standardKey.toLowerCase() ||
                    aliasList.some(a => a.toLowerCase() === trimmedKey.toLowerCase())) {
                    const val = variables[standardKey] || variables[Object.keys(variables).find(k => k.toLowerCase() === standardKey.toLowerCase()) || ''];
                    if (val !== undefined && val !== null) return String(val);
                }
            }

            // Return empty string if key found but value is null/empty, 
            // OR return original match if key NOT found to avoid stripping brackets?
            // User requested that "company" be replaced by the exact name, and if it's missing, maybe empty?
            // If the key is VALID but data is missing, we should probably return empty.
            if (foundKey) return "";

            return match;
        });
    }
}
