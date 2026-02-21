export class SpintaxService {

    /**
     * Parses nested spintax like "{Hi|Hello|{Hey|Greetings}}"
     */
    parse(text: string): string {
        if (!text) return '';

        const regex = /\{([^{}]+)\}/g;
        let result = text;

        // Keep replacing until no more brackets are found (handles nesting)
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
     */
    personalize(text: string, variables: Record<string, any>): string {
        if (!text) return '';

        let result = text;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'gi');
            result = result.replace(regex, String(value || '')); // Handle undefined gracefullly
        }
        return result;
    }
}
