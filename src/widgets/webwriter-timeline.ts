import { LitElementWw } from "@webwriter/lit";
import type { MsgFn } from "@lit/localize";
import { localizer } from "@webwriter/lit/localize";
import { localizeOptions } from "../model/localize-options";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import { ref } from "lit/directives/ref.js";
import SlTabGroup from "@shoelace-style/shoelace/dist/components/tab-group/tab-group.component.js";
import SlTabPanel from "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.component.js";
import SlTab from "@shoelace-style/shoelace/dist/components/tab/tab.component.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import ExclamationCircleIcon from "@tabler/icons/outline/exclamation-circle.svg";
import EyeSlashIcon from "@tabler/icons/outline/eye-off.svg";
import { computed, signal } from "@webwriter/lit";
import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { QuizContainer, QuizEvent } from "../components/quiz-container";
import { TimelineContainer } from "../components/timeline-container";
import type { WebwriterTimelineEvent } from "./webwriter-timeline-event";
import { TimelineDate } from "../model/timeline-date";
import { eventsFromCsv, eventsToCsv, ExchangeError } from "../model/timeline-exchange";
import {
    buildEvents,
    eventRecords,
    eventsFromFragment,
    eventsToDetails,
    recordsToParsed,
} from "../components/timeline-exchange";
import { Permissions } from "@webwriter/lit/permissions";

/**
 * Displays a timeline with events and a quiz based on those events.
 *
 * As children, it should only contain `<webwriter-timeline-event>` elements in order
 * to function properly. Any other children may lead to unexpected behavior.
 *
 * @part line - The vertical line of the timeline (also in the quiz panel).
 * @part marker - The dot of an event in the quiz panel. The dots in the timeline panel belong to `webwriter-timeline-event`.
 * @part card - A draggable event card in the quiz panel.
 *
 * Media rules for authored images and videos in the details are adopted as one page-level stylesheet into the root
 * that holds the element (counted per root, removed on disconnect); roots without `adoptedStyleSheets` skip it.
 *
 * Conversions: an `ol`, `ul`, `dl` or a series of `details` elements becomes a timeline, and the timeline can become
 * `details` elements. A list item, a `dt` or a `summary` starts with the date or date range (ISO 8601 such as
 * `1815-12-10`, or `10.12.1815`; a `time` element with `datetime` also works), then the title; what follows the title
 * is the detail text. Dates with a year below 1000 need the ISO form with four digits, such as `0476`.
 * The timeline reads and writes CSV (`.csv`, `text/csv`) with the columns `date`, `end_date`, `title` and `details`
 * (UTF-8, comma or semicolon separated on import). A file import replaces all events. CSV keeps plain text only:
 * the formatting, links and images in the details are dropped, and each paragraph of the details becomes one line.
 *
 * Signals: `score` is the share of events the reader placed correctly in the quiz after submitting (a number from 0 to 1,
 * 0 until then), and `complete` is `true` once the answers are submitted. A receiving widget connects with an
 * effect attribute such as `value-from="#timeline-id[score]"`. The timeline has no effects of its own.
 *
 * Theme: text uses `--ww-text-color` and `--ww-font-family`; the line, dots and highlights use `--ww-theme-accent-1` and `--ww-theme-accent-2`.
 *
 * Print: shows the active panel without tabs and controls. The quiz prints as a worksheet (event cards and empty date boxes).
 */
@customElement("webwriter-timeline")
export class WebwriterTimeline extends LitElementWw {
    /** @internal */
    static scopedElements = {
        "sl-button": SlButton,
        "sl-icon": SlIcon,
        "sl-tab-group": SlTabGroup,
        "sl-tab-panel": SlTabPanel,
        "sl-tab": SlTab,
        "timeline-container": TimelineContainer,
        "quiz-container": QuizContainer,
    };

    static styles = css`
        :host {
            display: block;
            box-sizing: border-box;
            width: 100%;
            min-width: min(300px, 100%);
            max-width: 2100px;
            min-height: 6rem;
            block-size: auto;
            color: var(--ww-text-color, inherit);
            font-family: var(--ww-font-family, inherit);
        }

        sl-icon {
            margin-left: var(--sl-spacing-x-small);
        }

        sl-tab-panel::part(base) {
            padding: 0;
        }

        sl-tab-group {
            --track-color: var(--ww-theme-accent-1, black);
            --indicator-color: transparent;
        }

        sl-tab-group::part(body) {
            /* Required for the drag-and-drop interaction in the quiz panel */
            overflow: visible;
        }

        .hide {
            display: none;
        }

        .timeline-empty {
            display: flex;
            gap: var(--sl-spacing-small);
            align-items: center;
        }

        @media print {
            :host {
                min-width: 0;
                max-width: none;
            }

            /* The paper shows the active panel only: no tabs. */
            sl-tab-group::part(nav) {
                display: none;
            }
        }
    `;

    static options = {
        panels: {
            type: "select" as const,
            label: (widget: { msg: MsgFn }) => widget.msg("Visible panels"),
            options: [
                { value: "timeline+quiz", label: (widget: { msg: MsgFn }) => widget.msg("Timeline and Quiz") },
                { value: "timeline", label: (widget: { msg: MsgFn }) => widget.msg("Timeline only") },
                { value: "quiz", label: (widget: { msg: MsgFn }) => widget.msg("Quiz only") },
            ],
        },
    };

    /** DOM and file conversions. See the class description for the formats. */
    static convertFrom = {
        ol: "fromElement",
        ul: "fromElement",
        dl: "fromElement",
        details: "fromElement",
        ".csv": "importCsv",
        "text/csv": "importCsv",
    };

    static convertTo = {
        details: "toDetails",
        "text/csv": "exportCsv",
    };

    localize = localizer(this, { ...localizeOptions, drawer: true });
    protected readonly msg = this.localize.msg;

    /** Timeline has no author-granted permissions. The module supplies the edit mode and `data-ww-can="edit"`. */
    readonly #permissions = new Permissions(this);

    /**
     * Which panels are enabled for the reader:
     * - "timeline": only the timeline panel
     * - "quiz": only the quiz panel
     * - "timeline+quiz": both panels with tabs
     */
    @property({ type: String, reflect: true, attribute: "panels" })
    accessor enabledPanels: "timeline" | "quiz" | "timeline+quiz" = "timeline+quiz";

    readonly #score = signal(0);
    readonly #complete = signal(false);

    /** The quiz result for other widgets: `score` from 0 to 1 and `complete` once the answers are submitted. */
    readonly signals = {
        score: computed(() => this.#score.get()),
        complete: computed(() => this.#complete.get()),
    };

    @state()
    private accessor eventsForQuiz: QuizEvent[] = [];

    private eventsObserver = new MutationObserver((records) => {
        if (
            records.some(
                ({ target }) =>
                    target === this ||
                    target.parentElement === this ||
                    (target instanceof Element ? target : target.parentElement)?.closest(
                        'h2[slot="title"], webwriter-timeline-event-title',
                    ),
            )
        ) {
            this.updateEventsForQuiz();
        }
    });

    /** The panels the author enabled in the `panels` attribute, e.g. "timeline+quiz". All of them if it is absent. */
    private get panelsForReaders() {
        const chosen = this.getAttribute("panels")?.split("+");
        return ["timeline", "quiz"].filter((panel) => !chosen || chosen.includes(panel));
    }

    connectedCallback() {
        super.connectedCallback();
        this.eventsObserver.observe(this, { childList: true, subtree: true, characterData: true, attributes: true });
        this.updateEventsForQuiz();
    }

    disconnectedCallback() {
        this.eventsObserver.disconnect();
        super.disconnectedCallback();
    }

    focus(options?: FocusOptions) {
        const events = this.querySelectorAll<WebwriterTimelineEvent>(":scope > webwriter-timeline-event");
        const event = events.length === 1 ? events[0] : null;
        if (event && !event.date && !event.textContent.trim() && event.children.length === 2 &&
            event.children[0].matches('h2[slot="title"]') && event.children[1].matches("p:empty")) {
            event.focus(options);
        } else {
            super.focus(options);
        }
    }

    protected firstUpdated() {
        // WebWriter loads the event widget separately from the timeline.
        customElements.whenDefined("webwriter-timeline-event").then(() => {
            if (this.isConnected) this.updateEventsForQuiz();
        });
    }

    private updateEventsForQuiz() {
        if (!customElements.get("webwriter-timeline-event")) return;

        const eventsForQuiz: QuizEvent[] = [];
        for (const child of this.children) {
            if (!(child instanceof HTMLElement) || child.tagName !== "WEBWRITER-TIMELINE-EVENT") continue;

            const event = child as WebwriterTimelineEvent;
            const titles = event.querySelectorAll(':scope > h2[slot="title"], :scope > webwriter-timeline-event-title');
            const titleElement = titles.length === 1 ? titles[0] : null;
            if (!event.date || !titleElement || titleElement.textContent.trim() === "") continue;

            eventsForQuiz.push({
                id: event.id,
                titleHtml: titleElement.innerHTML.trim(),
                date: event.date,
                endDate: event.endDate,
            });
        }
        this.eventsForQuiz = eventsForQuiz;
    }

    /** Takes over the events of a copied list, description list or `details` elements. */
    fromElement(fragment: DocumentFragment) {
        const parsed = eventsFromFragment(fragment);
        if (parsed.length === 0) return false;
        this.replaceChildren("\n", ...buildEvents(this.ownerDocument, parsed).flatMap((event) => [event, "\n"]));
    }

    /** The events as `details` elements, or `null` when there are none. */
    toDetails() {
        const fragment = eventsToDetails(this, this.lang);
        return fragment.childElementCount ? fragment : null;
    }

    /** Reads the whole file first. The returned function replaces all events. */
    async importCsv(file: File) {
        let parsed;
        try {
            parsed = recordsToParsed(this.ownerDocument, eventsFromCsv(await file.text()));
        } catch (error) {
            if (!(error instanceof ExchangeError)) throw error;
            if (error.code === "columns") throw new Error(this.msg("The file needs a date column and a title column."));
            if (error.code === "date") throw new Error(`${this.msg("The date is not valid in row")} ${error.row}.`);
            throw new Error(this.msg("The file contains no events."));
        }
        return () => {
            this.replaceChildren("\n", ...buildEvents(this.ownerDocument, parsed).flatMap((event) => [event, "\n"]));
        };
    }

    exportCsv() {
        const records = eventRecords(this);
        if (records.length === 0) return null;
        return new File([eventsToCsv(records)], "timeline.csv", { type: "text/csv" });
    }

    private quizStateChanged(event: CustomEvent<{ score: number; complete: boolean }>) {
        this.#score.set(event.detail.score);
        this.#complete.set(event.detail.complete);
    }

    private addEvent(event: CustomEvent) {
        event.stopPropagation();
        const newEvent = document.createElement("webwriter-timeline-event");
        const title = document.createElement("h2");
        title.slot = "title";
        newEvent.append(title, document.createElement("p"));
        this.appendChild(newEvent);
        newEvent.focus();
    }

    private dateChanged(event: Event) {
        event.stopPropagation();

        // When the date of an event changes, we need to reorder the events.
        const target = event.target as WebwriterTimelineEvent;
        const targetDate = target.date;

        let oldPos = Array.from(this.children).indexOf(target);
        let inserted = false;

        if (targetDate) {
            for (const child of this.children) {
                if ("date" in child && child.date) {
                    // Move the target before the first event with a date greater than the target's date
                    // (i.e. at the end of all events with a date less than or equal to the target's date)
                    if (targetDate.compare(child.date as TimelineDate) < 0) {
                        this.insertBefore(target, child);
                        inserted = true;
                        break;
                    }
                } else {
                    // Once we reach an event without a date, we can insert the target before it
                    // as all previous events have a date less than or equal to the target's date
                    this.insertBefore(target, child);
                    inserted = true;
                    break;
                }
            }
        }
        // If no event was found with a date greater than the target's date, append it to the end
        if (!inserted) this.appendChild(target);

        if (oldPos !== Array.from(this.children).indexOf(target)) {
            // For some reason, the element instance actually changes during reordering,
            // so we need to use a timeout and search for the updated instance to trigger the animation.
            setTimeout(() => {
                const updatedTarget = Array.from(this.children).find(
                    (child) => child.id === target.id,
                ) as WebwriterTimelineEvent;
                updatedTarget?.showMovedAnimation();
            }, 0);
        }
    }

    private initTabGroup(element?: Element) {
        const tabs = element as SlTabGroup | undefined;
        // Select the first tab whenever the tab group is mounted, including after an empty state.
        tabs?.updateComplete.then(() => {
            if (tabs.isConnected) tabs.show("timeline");
        });
    }

    private Quiz() {
        return html`<quiz-container exportparts="line, marker, card" @quiz-state=${this.quizStateChanged} .events=${this.eventsForQuiz} .language=${this.lang}></quiz-container>`;
    }

    private Timeline() {
        return html`<timeline-container
            exportparts="line"
            @add-event=${this.addEvent}
            @date-changed=${this.dateChanged}
        >
            <slot></slot>
        </timeline-container>`;
    }

    private PanelIcon(panelName: string) {
        if (!this.panelsForReaders.includes(panelName)) {
            return html`<sl-icon data-ww-can="edit" src=${EyeSlashIcon} label=${this.msg("(disabled)")}></sl-icon>`;
        } else {
            return nothing;
        }
    }

    private TabGroup() {
        if (!this.#permissions.editing && this.eventsForQuiz.length === 0) {
            // Keep authored events slotted while the timeline itself is hidden.
            return html`<slot class="hide"></slot>
                <div class="timeline-empty">
                    <sl-icon src=${ExclamationCircleIcon}></sl-icon>
                    ${this.msg("Timeline is empty.")}
                </div>`;
        }

        // Authors see every panel, readers the enabled ones.
        const visible = this.#permissions.editing ? ["timeline", "quiz"] : this.panelsForReaders;
        if (visible.length < 2) {
            return visible[0] === "quiz" ? html`<slot class="hide"></slot>${this.Quiz()}` : this.Timeline();
        }

        return html`<sl-tab-group ${ref(this.initTabGroup)} activation="manual">
            <sl-tab slot="nav" panel="timeline">${this.msg("Timeline")}${this.PanelIcon("timeline")}</sl-tab>
            <sl-tab slot="nav" panel="quiz">${this.msg("Quiz")}${this.PanelIcon("quiz")}</sl-tab>
            <sl-tab-panel name="timeline">${this.Timeline()}</sl-tab-panel>
            <sl-tab-panel name="quiz">${this.Quiz()}</sl-tab-panel>
        </sl-tab-group>`;
    }

    render() {
        return html`${this.TabGroup()}`;
    }
}
