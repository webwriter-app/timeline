import LOCALIZE from "./generated";
// @ts-expect-error Lit's localization CLI generates this module as JavaScript.
import { allLocales, sourceLocale } from "./generated/locale-codes.js";

const supportedLocales = new Map<string, string>(allLocales.map((locale: string) => [locale.toLowerCase(), locale]));

export function parseLocale(language: string | null | undefined): Intl.Locale {
    try {
        return new Intl.Locale(language?.trim() || sourceLocale);
    } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        return new Intl.Locale(sourceLocale);
    }
}

export default {
    getLocale: LOCALIZE.getLocale,
    setLocale(language: string | null | undefined) {
        const locale = parseLocale(language);
        const { language: base, script, region } = locale.maximize();
        return LOCALIZE.setLocale(
            supportedLocales.get(locale.baseName.toLowerCase()) ??
                supportedLocales.get(`${base}-${script}`.toLowerCase()) ??
                supportedLocales.get(`${base}-${region}`.toLowerCase()) ??
                supportedLocales.get(base) ??
                sourceLocale,
        );
    },
};
