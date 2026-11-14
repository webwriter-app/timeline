import { ComplexAttributeConverter } from "lit";
import { parseLocale } from "../../localization/localizer";

const gregorianDateLabels: Record<string, { months: string[]; beforeCommonEra: string }> = {
    dv: {
        months: ["ޖަނަވަރީ", "ފެބްރުވަރީ", "މާރޗް", "އޭޕްރީލް", "މޭ", "ޖޫން", "ޖުލައި", "އޯގަސްޓް", "ސެޕްޓެމްބަރު", "އޮކްޓޯބަރު", "ނޮވެމްބަރު", "ޑިސެމްބަރު"],
        beforeCommonEra: "މީލާދުން ކުރިން",
    },
    la: {
        months: ["Ianuarii", "Februarii", "Martii", "Aprilis", "Maii", "Iunii", "Iulii", "Augusti", "Septembris", "Octobris", "Novembris", "Decembris"],
        beforeCommonEra: "a. Chr. n.",
    },
    tpi: {
        months: ["Janueri", "Februeri", "Mas", "Epril", "Me", "Jun", "Julai", "Ogas", "Septemba", "Oktoba", "Novemba", "Disemba"],
        beforeCommonEra: "bipo long Krais",
    },
};

/**
 * A custom data class to represent a date inside this widget. It supports
 * year-only, year-month, and year-month-day precision, with validation based
 * on the Gregorian calendar.
 *
 * Years use astronomical year numbering, meaning that year 0 corresponds to
 * 1 BC, year -1 to 2 BC, and so on.
 */
export class TimelineDate {
    /**
     * Check if a given year is a leap year.
     */
    static isLeapYear(year: number): boolean {
        const mod = (a: number, n: number) => ((a % n) + n) % n;
        return mod(year, 400) === 0 || (mod(year, 4) === 0 && mod(year, 100) !== 0);
    }

    /**
     * Get the number of days in a given month of a specific year.
     */
    private static daysInMonth(year: number, month: number): number {
        if (month === 2) return TimelineDate.isLeapYear(year) ? 29 : 28;
        return [1, 3, 5, 7, 8, 10, 12].includes(month) ? 31 : 30;
    }

    readonly year: number;
    readonly month: number | null;
    readonly day: number | null;

    constructor(year: number, month: number | null = null, day: number | null = null) {
        if (!Number.isInteger(year)) throw new Error("INVALID_YEAR");
        if (month !== null) {
            if (!Number.isInteger(month)) throw new Error("INVALID_MONTH");
            if (month < 1 || month > 12) throw new Error("INVALID_MONTH");
        }
        if (day !== null) {
            if (!Number.isInteger(day)) throw new Error("INVALID_DAY");
            if (month === null) throw new Error("INVALID_DAY");
            const dim = TimelineDate.daysInMonth(year, month);
            if (day < 1 || day > dim) throw new Error("INVALID_DAY");
        }

        this.year = year;
        this.month = month;
        this.day = day;
    }

    /**
     * Converts the date to a JavaScript Date object.
     *
     * If month or day are not specified, they default to January and 1st respectively,
     * and the time is always set to midnight UTC.
     */
    toDate(): Date {
        const date = new Date(0);
        date.setUTCFullYear(this.year);
        date.setUTCMonth((this.month ?? 1) - 1);
        date.setUTCDate(this.day ?? 1);
        return date;
    }

    /**
     * Converts the date to a localized string, using the Intl.DateTimeFormat API.
     * @param locale The locale to use for formatting (e. g. "en-US" or "de-DE")
     * @param options Formatting options for year, month, day, and era. The era option
     * 			      is only applied for negative years (BC).
     */
    toLocalizedString(
        locale: string,
        options: Pick<Intl.DateTimeFormatOptions, "year" | "month" | "day" | "era"> = {},
    ): string {
        const date = this.toDate();
        const parsed = parseLocale(locale);
        const localeName = parsed.toString();
        const labels = gregorianDateLabels[parsed.language];
        const fallback = labels && !Intl.DateTimeFormat.supportedLocalesOf(localeName).length;
        const month = options.month ?? "long";
        const formatter = Intl.DateTimeFormat(fallback ? "en-GB" : localeName, {
            calendar: "gregory",
            timeZone: "UTC",
            year: options.year ?? "numeric",
            month: this.month !== null ? month : undefined,
            day: this.day !== null ? (options.day ?? "numeric") : undefined,
            era: this.year <= 0 ? (options.era ?? "short") : undefined,
        });
        if (!fallback) return formatter.format(date);
        return formatter.formatToParts(date).map(part => {
            if (part.type === "era") return labels.beforeCommonEra;
            if (part.type !== "month" || this.month === null || month === "numeric" || month === "2-digit") return part.value;
            const name = labels.months[this.month - 1];
            if (month === "long") return name;
            // Keep combining marks attached when abbreviating the month.
            return name.match(/\P{M}\p{M}*/gu)?.slice(0, month === "short" ? 3 : 1).join("") ?? name;
        }).join("");
    }

    /**
     * Converts the date to an ISO 8601 formatted string.
     */
    toISOString(): string {
        let result = "";

        if (this.year < 0) result += "-";
        result += Math.abs(this.year).toString().padStart(4, "0");

        if (this.month !== null) result += "-" + this.month.toString().padStart(2, "0");

        if (this.day !== null) result += "-" + this.day.toString().padStart(2, "0");

        return result;
    }

    /**
     * Converts an ISO 8601 formatted date string to a TimelineDate instance.
     */
    static fromISOString(isoString: string): TimelineDate {
        const parts = /([+-]?\d{4,})(-\d{2})?(-\d{2})?/.exec(isoString);
        if (!parts) throw new Error("Invalid ISO date string");

        const year = parseInt(parts[1], 10);
        const month = parts[2] ? parseInt(parts[2].slice(1), 10) : null;
        const day = parts[3] ? parseInt(parts[3].slice(1), 10) : null;

        return new TimelineDate(year, month, day);
    }

    /**
     * Converts the date to a European formatted string (DD.MM.YYYY).
     */
    toEuropeanString(): string {
        let result = "";

        if (this.day !== null) result += this.day.toString().padStart(2, "0") + ".";

        if (this.month !== null) result += this.month.toString().padStart(2, "0") + ".";

        if (this.year <= 0) result += "-" + (Math.abs(this.year) + 1).toString().padStart(4, "0");
        else result += this.year.toString().padStart(4, "0");

        return result;
    }

    /**
     * Converts a European formatted date string (DD.MM.YYYY) to a TimelineDate instance.
     */
    static fromEuropeanString(euroString: string): TimelineDate {
        if (!/^(\d+.)?(\d+.)?(-?\d+)$/.test(euroString)) throw new Error("INVALID_FORMAT");

        const parts = euroString.split(".").reverse();

        let year = parseInt(parts[0], 10);
        let month = parts.length >= 2 ? parseInt(parts[1], 10) : null;
        let day = parts.length === 3 ? parseInt(parts[2], 10) : null;

        if (year === 0) throw new Error("YEAR_ZERO_INVALID");
        if (year < 0) year++;

        return new TimelineDate(year, month, day);
    }

    /**
     * Converts the date to an obfuscated string representation by XORing
     * the binary data with a random seed and encoding it in base64. This ensures
     * that the date is not easily readable or comparable in its string form.
     *
     * This is not secure, no confidentiality or integrity guarantees are provided.
     */
    toObfuscatedString(): string {
        const buffer = new Uint8Array(6);
        const view = new DataView(buffer.buffer);
        view.setInt32(0, this.year, true);
        view.setUint8(4, this.month ?? 0);
        view.setUint8(5, this.day ?? 0);

        const seed = crypto.getRandomValues(new Uint8Array(6));
        for (let i = 0; i < 6; i++) buffer[i] = buffer[i] ^ seed[i];
        return btoa(String.fromCharCode(...[...seed, ...buffer]));
    }

    /**
     * Converts an obfuscated string representation back to a TimelineDate instance.
     */
    static fromObfuscatedString(obfString: string): TimelineDate {
        const bufferString = atob(obfString);
        if (bufferString.length !== 12) throw new Error("Invalid obfuscated date string");
        const buffer = new Uint8Array(6);
        for (let i = 0; i < 6; i++) buffer[i] = bufferString.charCodeAt(i + 6) ^ bufferString.charCodeAt(i);

        const view = new DataView(buffer.buffer);
        const year = view.getInt32(0, true);
        const month = view.getUint8(4) === 0 ? null : view.getUint8(4);
        const day = view.getUint8(5) === 0 ? null : view.getUint8(5);

        return new TimelineDate(year, month, day);
    }

    compare(other: TimelineDate): number {
        if (this.year !== other.year) return this.year - other.year;
        if ((this.month ?? 0) !== (other.month ?? 0)) return (this.month ?? 0) - (other.month ?? 0);
        return (this.day ?? 0) - (other.day ?? 0);
    }

    clone(): TimelineDate {
        return new TimelineDate(this.year, this.month, this.day);
    }
}

export const timelineDateConverter: ComplexAttributeConverter<TimelineDate | null> = {
    fromAttribute(value: string | null): TimelineDate | null {
        try {
            if (!value) return null;
            if (value.startsWith("$")) {
                return TimelineDate.fromObfuscatedString(value.slice(1));
            } else {
                return TimelineDate.fromISOString(value);
            }
        } catch {
            return null;
        }
    },
    toAttribute(value: TimelineDate | null): string | null {
        if (!value) return null;
        return "$" + value.toObfuscatedString();
    },
};
