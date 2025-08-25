declare module 'british_american_translate' {
    interface Translate {
        /**
         * Convert British spellings to American spellings
         */
        uk2us(text: string): string;

        /**
         * Convert American spellings to British spellings
         */
        us2uk(text: string): string;
    }

    const translate: Translate;
    export = translate;
}
