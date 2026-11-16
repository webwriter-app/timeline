import type { LocalizeOptions } from "@webwriter/lit/localize";
// @ts-ignore The Lit localization CLI emits the locale index as JavaScript.
import { sourceLocale, targetLocales } from "../../localization/generated/locale-codes.js";

/** The language setup shared by the widgets: `localize = localizer(this, localizeOptions)`. */
export const localizeOptions: LocalizeOptions = {
    sourceLocale,
    targetLocales,
    prefer: { pt: "pt-PT" },
    load: (locale) => import(`../../localization/generated/${locale}.ts`),
};

/** Parses a language tag for date formatting; an empty or invalid tag gives the source locale. */
export function parseLocale(language: string | null | undefined): Intl.Locale {
    try {
        return new Intl.Locale(language?.trim() || sourceLocale);
    } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        return new Intl.Locale(sourceLocale);
    }
}
