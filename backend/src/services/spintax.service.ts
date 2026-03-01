export class SpintaxService {

    /**
     * Parses nested spintax like "{{Hi|Hello|{{Hey|Greetings}}}}"
     * Replaces with a random option.
     */
    parse(text: string): string {
        if (!text) return '';

        // Match {{ A | B }} or { A | B }
        // We look for patterns with a pipe | inside braces
        const regex = /\{+([^{|}]+\|[^{}]*)\}+/g;
        let result = text;

        while (result.match(regex)) {
            result = result.replace(regex, (match, content) => {
                const options = content.split('|').map(o => o.trim());
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

        // 0. Extract metadata if present and merge it into variables
        let mergedVariables = { ...variables };
        if (variables.metadata && typeof variables.metadata === 'string') {
            try {
                const meta = JSON.parse(variables.metadata);
                // Standard fields in 'variables' override metadata if there's a conflict
                mergedVariables = { ...meta, ...variables };
                console.log(`[Spintax] Merged metadata fields:`, Object.keys(meta));
            } catch (e) {
                // Not JSON, ignore or log
            }
        }

        // Log keys to see what's available
        const availableKeys = Object.keys(mergedVariables);
        console.log(`[Spintax] Personalizing. Available variables: ${availableKeys.join(', ')}`);

        // Regex to find all {{ key }} occurrences
        return text.replace(/\{\{\s*([\w\s_-]+)\s*\}\}/gi, (match, key) => {
            const rawKey = key.trim();
            const lowerKey = rawKey.toLowerCase();

            // 1. Direct Case-Insensitive Lookup
            const foundKey = Object.keys(mergedVariables).find(k => k.toLowerCase() === lowerKey);
            if (foundKey && mergedVariables[foundKey] !== undefined && mergedVariables[foundKey] !== null) {
                const val = String(mergedVariables[foundKey]);
                // Guard: If the value is literally the same as the tag (corruption), return empty to avoid "Hi firstName"
                if (val.trim() === rawKey || val.trim() === match) {
                    console.log(`[Spintax] Warning: Data corruption detected for tag ${match}. Value is literal string "${val}". Returning empty.`);
                    return '';
                }
                return val;
            }

            // 2. Alias Mapping
            const aliasMap: Record<string, string[]> = {
                firstName: ['first_name', 'name', 'fname', 'first'],
                lastName: ['last_name', 'lname', 'last'],
                company: ['company_name', 'companyName', 'org', 'organization', 'business'],
                email: ['email_address', 'emailAddress', 'mail']
            };

            for (const [standardKey, aliases] of Object.entries(aliasMap)) {
                if (lowerKey === standardKey.toLowerCase() || aliases.some(a => a.toLowerCase() === lowerKey)) {
                    // Find if any of these standard keys or aliases exist in the variables
                    const keysToCheck = [standardKey, ...aliases];
                    for (const check of keysToCheck) {
                        const targetKey = Object.keys(mergedVariables).find(k => k.toLowerCase() === check.toLowerCase());
                        if (targetKey && mergedVariables[targetKey] !== undefined && mergedVariables[targetKey] !== null && mergedVariables[targetKey] !== '') {
                            const val = String(mergedVariables[targetKey]);
                            // Guard: Only return if it's not literal corruption
                            if (val.trim() !== check && val.trim() !== `{{${check}}}`) {
                                return val;
                            }
                        }
                    }
                }
            }

            // 3. Fallback: If we recognize it as a standard field but data is missing/empty, return empty string
            const standardFields = ['firstname', 'lastname', 'company', 'email', 'name', 'first_name', 'last_name', 'company_name'];
            if (standardFields.includes(lowerKey)) {
                console.log(`[Spintax] Warning: Tag {{${rawKey}}} matched a standard field but no data found. Returning empty string.`);
                return '';
            }

            // 4. Default: Return original match if totally unknown to avoid stripping
            console.log(`[Spintax] Unknown tag {{${rawKey}}}. Preserving.`);
            return match;
        });
    }
}
