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

            // Case-insensitive lookup
            const foundKey = Object.keys(variables).find(
                k => k.toLowerCase() === trimmedKey.toLowerCase()
            );

            if (foundKey && variables[foundKey] !== undefined && variables[foundKey] !== null) {
                return String(variables[foundKey]);
            }

            // Return original match if key not found to avoid stripping brackets
            return match;
        });
    }
}
