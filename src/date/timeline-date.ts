import { ComplexAttributeConverter } from "lit";

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
        if (!Number.isInteger(year)) throw new Error("Invalid year");
        if (month !== null) {
            if (!Number.isInteger(month)) throw new Error("Invalid month");
            if (month < 1 || month > 12) throw new Error("Month out of range");
        }
        if (day !== null) {
            if (!Number.isInteger(day)) throw new Error("Invalid day");
            if (month === null) throw new Error("Day provided without month");
            const dim = TimelineDate.daysInMonth(year, month);
            if (day < 1 || day > dim) throw new Error("Day out of range");
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
        return Intl.DateTimeFormat(locale, {
            year: options.year ?? "numeric",
            month: this.month !== null ? (options.month ?? "long") : undefined,
            day: this.day !== null ? (options.day ?? "numeric") : undefined,
            era: this.year <= 0 ? (options.era ?? "short") : undefined,
        }).format(date);
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
     *
     */
    toEuropeanString(): string {
        let result = "";

        if (this.day !== null) result += this.day.toString().padStart(2, "0") + ".";

        if (this.month !== null) result += this.month.toString().padStart(2, "0") + ".";

        if (this.year <= 0) result += "-" + (Math.abs(this.year) + 1).toString().padStart(4, "0");
        else result += this.year.toString().padStart(4, "0");

        return result;
    }

    static fromEuropeanString(euroString: string): TimelineDate {
        const parts = euroString.split(".").reverse();
        if (parts.length < 1 || parts.length > 3) throw new Error("Invalid European date string");

        let year = parseInt(parts[0], 10);
        let month = parts.length >= 2 ? parseInt(parts[1], 10) : null;
        let day = parts.length === 3 ? parseInt(parts[2], 10) : null;

        if (year === 0) throw new Error("Year 0 does not exist");
        if (year < 0) year++;

        return new TimelineDate(year, month, day);
    }

    compare(other: TimelineDate): number {
        if (this.year !== other.year) return this.year - other.year;
        if ((this.month ?? 0) !== (other.month ?? 0)) return (this.month ?? 0) - (other.month ?? 0);
        return (this.day ?? 0) - (other.day ?? 0);
    }
}

export const timelineDateConverter: ComplexAttributeConverter<TimelineDate> = {
    fromAttribute(value: string | null): TimelineDate | null {
        try {
            if (!value) return null;
            return TimelineDate.fromISOString(value);
        } catch {
            return null;
        }
    },
    toAttribute(value: TimelineDate | null): string | null {
        if (!value) return null;
        return value.toISOString();
    },
};
