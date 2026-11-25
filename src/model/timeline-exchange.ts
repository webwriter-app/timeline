import { TimelineDate } from "./timeline-date";

/** One event as a row of text, the common shape of the CSV format. */
export interface EventRecord {
    date: TimelineDate | null;
    endDate: TimelineDate | null;
    title: string;
    details: string;
}

/** The reasons an import can fail. The widget turns each into a localized message. */
export class ExchangeError extends Error {
    constructor(
        readonly code: "columns" | "empty" | "date",
        readonly row = 0,
    ) {
        super(code);
    }
}

const YEAR = "[+-]?\\d{4,6}";
const MONTH = "-(?:0[1-9]|1[0-2])";
const DAY = "-(?:0[1-9]|[12]\\d|3[01])";
const ISO = `${YEAR}(?:${MONTH}(?:${DAY})?)?(?!\\d)`;
const EUROPEAN = "\\d{1,2}\\.\\d{1,2}\\.-?\\d{1,6}(?!\\d)";
const TOKEN = `(?:${EUROPEAN}|${ISO})`;
const LEADING_DATES = new RegExp(
    `^\\s*(${TOKEN})(?:\\s*(?:–|—|\\s-\\s|-|\\bto\\b|\\bbis\\b|/)\\s*(${TOKEN}))?(?=[\\s:–—-]|$)[\\s:–—-]*([\\s\\S]*)$`,
    "u",
);

/**
 * Reads one date: ISO 8601 with the astronomical year ("1815", "1815-12", "1815-12-10", "-0043"),
 * or the European "10.12.1815". Gives `null` for anything else.
 */
export function parseDate(text: string): TimelineDate | null {
    const value = text.trim();
    try {
        if (/^\d{1,2}\.\d{1,2}\.-?\d+$/.test(value)) return TimelineDate.fromEuropeanString(value);
        const parts = /^([+-]?\d{1,6})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(value);
        if (!parts) return null;
        return new TimelineDate(Number(parts[1]), parts[2] ? Number(parts[2]) : null, parts[3] ? Number(parts[3]) : null);
    } catch {
        return null;
    }
}

/**
 * Splits a date, or a date range, off the start of a text such as "1815-12-10 – 1852-11-27: Ada Lovelace".
 * Gives `null` when the text does not start with a date that is followed by a space, a colon or a dash.
 */
export function splitLeadingDates(
    text: string,
): { date: TimelineDate; endDate: TimelineDate | null; rest: string } | null {
    const match = LEADING_DATES.exec(text);
    if (!match) return null;
    const date = parseDate(match[1]);
    const endDate = match[2] ? parseDate(match[2]) : null;
    if (!date || (match[2] && !endDate)) return null;
    return { date, endDate, rest: match[3] };
}

/** Reads CSV as RFC 4180 describes it: quoted cells may hold the delimiter, quotes and line breaks. */
export function parseCsv(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    const endRow = () => {
        row.push(cell);
        cell = "";
        if (row.some((value) => value.trim() !== "")) rows.push(row);
        row = [];
    };
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quoted) {
            if (char !== '"') cell += char;
            else if (text[i + 1] === '"') (cell += '"'), i++;
            else quoted = false;
        } else if (char === '"' && cell === "") quoted = true;
        else if (char === delimiter) (row.push(cell), (cell = ""));
        else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[i + 1] === "\n") i++;
            endRow();
        } else cell += char;
    }
    if (cell !== "" || row.length) endRow();
    return rows;
}

function csvCell(value: string): string {
    return /[",\r\n]/.test(value) || value !== value.trim() ? `"${value.replaceAll('"', '""')}"` : value;
}

const COLUMN_NAMES: Record<keyof EventRecord, string[]> = {
    date: ["date", "start", "startdate", "begin", "from"],
    endDate: ["enddate", "end", "until", "to"],
    title: ["title", "event", "name", "headline"],
    details: ["details", "description", "text", "body", "content"],
};

/** The CSV of events: a header row, then one row per event. Dates are ISO 8601. */
export function eventsToCsv(records: EventRecord[]): string {
    const rows = [
        ["date", "end_date", "title", "details"],
        ...records.map((record) => [
            record.date?.toISOString() ?? "",
            record.endDate?.toISOString() ?? "",
            record.title,
            record.details,
        ]),
    ];
    return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/**
 * Reads events from CSV with a header row that names at least a date and a title column (comma or
 * semicolon separated). Throws an `ExchangeError` for a file that has no such columns, no events or a date that is not valid.
 */
export function eventsFromCsv(source: string): EventRecord[] {
    const text = source.replace(/^﻿/, "");
    const firstLine = text.split(/\r?\n/, 1)[0];
    const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
    const [header, ...rows] = parseCsv(text, delimiter);
    const names = (header ?? []).map((name) => name.toLowerCase().replace(/[\s_-]/g, ""));
    const index = (key: keyof EventRecord) => names.findIndex((name) => COLUMN_NAMES[key].includes(name));
    const columns = { date: index("date"), endDate: index("endDate"), title: index("title"), details: index("details") };
    if (columns.date < 0 || columns.title < 0) throw new ExchangeError("columns");

    const records: EventRecord[] = [];
    rows.forEach((row, i) => {
        const cell = (column: number) => (column < 0 ? "" : (row[column] ?? "").trim());
        const read = (column: number) => {
            const value = cell(column);
            if (!value) return null;
            const date = parseDate(value);
            if (!date) throw new ExchangeError("date", i + 2);
            return date;
        };
        records.push({
            date: read(columns.date),
            endDate: read(columns.endDate),
            title: cell(columns.title),
            details: columns.details < 0 ? "" : (row[columns.details] ?? "").trim(),
        });
    });
    if (records.length === 0) throw new ExchangeError("empty");
    return records;
}
