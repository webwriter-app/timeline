import { TimelineDate, timelineDateConverter } from "../model/timeline-date";
import { parseDate, splitLeadingDates, type EventRecord } from "../model/timeline-exchange";

/** An event read from native HTML: the title is inline content, the details are flow content. */
export interface ParsedEvent {
    date: TimelineDate | null;
    endDate: TimelineDate | null;
    title: Node[];
    details: Node[];
}

const BLOCKS = new Set([
    "address", "article", "aside", "blockquote", "details", "div", "dl", "figure", "h1", "h2", "h3", "h4", "h5", "h6",
    "hr", "ol", "p", "pre", "section", "table", "ul",
]);

const isBlank = (node: Node) => node.nodeType === Node.TEXT_NODE && !node.textContent!.trim();
const isBlock = (node: Node) => node instanceof Element && BLOCKS.has(node.localName);
const SEPARATOR = /^[\s:–—-]+/;

/** Takes a date or date range off the start of the title nodes: `time` elements first, then leading text. */
function takeDates(nodes: Node[]): Pick<ParsedEvent, "date" | "endDate"> {
    const dates: Pick<ParsedEvent, "date" | "endDate"> = { date: null, endDate: null };
    while (nodes.length && isBlank(nodes[0])) nodes.shift();
    const first = nodes[0];
    if (first instanceof Element && first.localName === "time") {
        const date = parseDate(first.getAttribute("datetime") ?? "");
        if (date) {
            nodes.shift();
            dates.date = date;
            const rest = nodes[0];
            const second = nodes[1];
            if (
                rest?.nodeType === Node.TEXT_NODE &&
                /^\s*(?:–|—|-|to|bis|\/)\s*$/.test(rest.textContent!) &&
                second instanceof Element &&
                second.localName === "time"
            ) {
                dates.endDate = parseDate(second.getAttribute("datetime") ?? "");
                if (dates.endDate) nodes.splice(0, 2);
            }
        }
    } else if (first) {
        const text = first.textContent ?? "";
        const parts = splitLeadingDates(text);
        // A wrapper such as <strong>1815</strong> counts only when it holds nothing but the date.
        if (parts && (first.nodeType === Node.TEXT_NODE || !parts.rest.trim())) {
            Object.assign(dates, { date: parts.date, endDate: parts.endDate });
            if (first.nodeType === Node.TEXT_NODE) first.textContent = parts.rest;
            else nodes.shift();
        }
    }
    if (dates.date && nodes[0]?.nodeType === Node.TEXT_NODE) {
        nodes[0].textContent = nodes[0].textContent!.replace(SEPARATOR, "");
    }
    return dates;
}

/** Drops blank nodes at both ends. */
function trimNodes(nodes: Node[]): Node[] {
    while (nodes.length && isBlank(nodes[0])) nodes.shift();
    while (nodes.length && isBlank(nodes[nodes.length - 1])) nodes.pop();
    if (nodes[0]?.nodeType === Node.TEXT_NODE) nodes[0].textContent = nodes[0].textContent!.trimStart();
    const last = nodes[nodes.length - 1];
    if (last?.nodeType === Node.TEXT_NODE) last.textContent = last.textContent!.trimEnd();
    return nodes;
}

function parsedEvent(heading: Node[], details: Node[]): ParsedEvent {
    const title = [...heading];
    const dates = takeDates(title);
    return { ...dates, title: trimNodes(title), details: details.filter((node) => !isBlank(node)) };
}

/** A list item is the title up to its first block, then the details. */
function fromItem(item: Element): ParsedEvent {
    const nodes = [...item.childNodes];
    const split = nodes.findIndex(isBlock);
    return parsedEvent(split < 0 ? nodes : nodes.slice(0, split), split < 0 ? [] : nodes.slice(split));
}

/** A `details` element is the summary, then the details. */
function fromDetails(element: Element): ParsedEvent {
    const summary = element.querySelector(":scope > summary");
    const rest = [...element.childNodes].filter((node) => node !== summary);
    return parsedEvent(summary ? [...summary.childNodes] : [], rest);
}

/** A description list gives one event per term. A term with only a date takes the first description as title. */
function fromDescriptionList(list: Element): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    const entries = [...list.children].flatMap((child) => (child.localName === "div" ? [...child.children] : [child]));
    let term: Element | null = null;
    let descriptions: Element[] = [];
    const flush = () => {
        if (!term) return;
        const event = parsedEvent([...term.childNodes], []);
        let detailNodes = descriptions.flatMap((dd) => [...dd.childNodes]);
        if (event.title.length === 0 && descriptions.length) {
            event.title = trimNodes([...descriptions[0].childNodes]);
            detailNodes = descriptions.slice(1).flatMap((dd) => [...dd.childNodes]);
        }
        event.details = detailNodes.filter((node) => !isBlank(node));
        events.push(event);
    };
    for (const entry of entries) {
        if (entry.localName === "dt") {
            flush();
            term = entry;
            descriptions = [];
        } else if (entry.localName === "dd") descriptions.push(entry);
    }
    flush();
    return events;
}

/** Reads the events of a copied `ol`, `ul`, `dl` or of `details` elements. */
export function eventsFromFragment(fragment: DocumentFragment): ParsedEvent[] {
    const roots = [...fragment.children];
    const events = roots.flatMap((root) => {
        if (root.localName === "ol" || root.localName === "ul") {
            return [...root.children].filter((child) => child.localName === "li").map(fromItem);
        }
        if (root.localName === "dl") return fromDescriptionList(root);
        if (root.localName === "details") return [fromDetails(root)];
        return [];
    });
    return events.filter((event) => event.title.length > 0 || event.date);
}

/** Loose text and inline elements in the details become paragraphs; an empty detail becomes one empty paragraph. */
function detailsContent(doc: Document, nodes: Node[]): Node[] {
    const content: Node[] = [];
    let paragraph: HTMLElement | null = null;
    for (const node of nodes) {
        if (isBlock(node)) {
            paragraph = null;
            content.push(node);
        } else {
            if (!paragraph) content.push((paragraph = doc.createElement("p")));
            paragraph.append(node);
        }
    }
    const filled = content.filter((node) => !(node instanceof HTMLElement && node.localName === "p" && !node.textContent!.trim() && !node.children.length));
    return filled.length ? filled : [doc.createElement("p")];
}

/** The events in the order of their dates; events without a date come last. */
function sortByDate<T extends { date: TimelineDate | null }>(events: T[]): T[] {
    return events
        .map((event, index) => ({ event, index }))
        .sort((a, b) => {
            if (!a.event.date || !b.event.date) return Number(!a.event.date) - Number(!b.event.date) || a.index - b.index;
            return a.event.date.compare(b.event.date) || a.index - b.index;
        })
        .map(({ event }) => event);
}

/** Builds the `webwriter-timeline-event` elements. Dates are set as attributes, as in the snippets. */
export function buildEvents(doc: Document, parsed: ParsedEvent[]): HTMLElement[] {
    return sortByDate(parsed).map(({ date, endDate, title, details }) => {
        const event = doc.createElement("webwriter-timeline-event");
        if (date) event.setAttribute("date", date.toISOString());
        if (endDate) event.setAttribute("enddate", endDate.toISOString());
        const titleElement = doc.createElement("h2");
        titleElement.slot = "title";
        titleElement.append(...title);
        event.append("\n", titleElement, "\n", ...detailsContent(doc, details), "\n");
        return event;
    });
}

/** Builds events from records of text, as the CSV file gives them. */
export function recordsToParsed(doc: Document, records: EventRecord[]): ParsedEvent[] {
    return records.map(({ date, endDate, title, details }) => ({
        date,
        endDate,
        title: title ? [doc.createTextNode(title)] : [],
        details: details.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
            const paragraph = doc.createElement("p");
            paragraph.textContent = line;
            return paragraph;
        }),
    }));
}

/** The timeline's events as they are in the document: their dates and the title and details elements. */
export function readEvents(timeline: Element) {
    return [...timeline.children]
        .filter((child) => child.localName === "webwriter-timeline-event")
        .map((event) => {
            const title = event.querySelector(':scope > h2[slot="title"], :scope > webwriter-timeline-event-title');
            const legacyDetails = event.querySelector(":scope > webwriter-timeline-event-details");
            return {
                date: timelineDateConverter.fromAttribute!(event.getAttribute("date")),
                endDate: timelineDateConverter.fromAttribute!(event.getAttribute("enddate")),
                title,
                details: [...(legacyDetails?.childNodes ?? event.childNodes)].filter((node) => node !== title),
            };
        });
}

/** Events as records of text for CSV. Formatting, images and links in the details are dropped. */
export function eventRecords(timeline: Element): EventRecord[] {
    const text = (element: Node | null | undefined) => (element?.textContent ?? "").replace(/\s+/g, " ").trim();
    return readEvents(timeline)
        .filter((event) => event.date || text(event.title))
        .map(({ date, endDate, title, details }) => ({
            date,
            endDate,
            title: text(title),
            details: details.map(text).filter(Boolean).join("\n"),
        }));
}

/** One `details` element per event: the dates (as `time` elements) and the title in the summary, then the details. */
export function eventsToDetails(timeline: Element, language: string): DocumentFragment {
    const doc = timeline.ownerDocument;
    const fragment = doc.createDocumentFragment();
    const time = (date: TimelineDate) => {
        const element = doc.createElement("time");
        element.dateTime = date.toISOString();
        element.textContent = date.toLocalizedString(language);
        return element;
    };
    for (const { date, endDate, title, details } of readEvents(timeline)) {
        if (!title?.textContent?.trim()) continue;
        const summary = doc.createElement("summary");
        if (date) {
            summary.append(time(date));
            if (endDate) summary.append(" – ", time(endDate));
            summary.append(": ");
        }
        summary.append(...[...title.childNodes].map((node) => node.cloneNode(true)));
        const element = doc.createElement("details");
        element.append(summary, ...details.map((node) => node.cloneNode(true)));
        if (fragment.childNodes.length) fragment.append("\n");
        fragment.append(element);
    }
    return fragment;
}
