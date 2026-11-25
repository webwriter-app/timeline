import { LitElementWw } from "@webwriter/lit";
import { widgetMsg } from "@webwriter/lit/localize";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlProgressRing from "@shoelace-style/shoelace/dist/components/progress-ring/progress-ring.component.js";
import { css, html, nothing, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { TimelineDate } from "../model/timeline-date";
import { TimelineTemplate } from "./timeline-template";
import { Drag, type DragCommitDetail } from "@webwriter/lit/drag";

export type QuizEvent = {
    id: string;
    titleHtml: string;
    date: TimelineDate;
    endDate: TimelineDate | null;
};

/**
 * The quiz panel: event titles are cards, each event's date is a slot.
 * Dragging, keyboard placement and gating come from the declarative
 * modules; this class holds the model and the template.
 */
export class QuizContainer extends LitElementWw {
    protected readonly msg = widgetMsg(this);

    /** @internal */
    static scopedElements = {
        "timeline-template": TimelineTemplate,
        "sl-button": SlButton,
        "sl-progress-ring": SlProgressRing,
    };

    static styles = css`
        :host {
            display: block;
            min-width: 0;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
        }

        .quiz-frame {
            container-type: inline-size;
        }

        .quiz-container {
            width: 100%;
            display: grid;
            grid-template-columns: calc(50% - 1em) minmax(0, 1fr);
            gap: 0 0.5em;
            align-items: start;
        }

        /* Narrow: the tray of cards above the timeline. */
        @container (max-width: 31rem) {
            .quiz-container {
                grid-template-columns: minmax(0, 1fr);
            }
        }

        .empty-quiz {
            padding: var(--sl-spacing-x-small);
            padding-left: 1.5rem;
            color: var(--sl-color-neutral-500);
        }

        .unassigned-events-container {
            display: flex;
            flex-direction: column;
            padding: var(--sl-spacing-small) 0;
            height: 100%;
            box-sizing: border-box;
        }

        .event-cards-container {
            display: flex;
            flex-direction: column;
            gap: var(--sl-spacing-small);
            width: 100%;
            min-height: 0;
            box-sizing: border-box;
        }

        .event-slot > .event-cards-container {
            display: grid;

            > .card-base {
                grid-area: 1 / 1;
            }

            > .card-event {
                position: relative;
            }
        }

        .unassigned-events-container > .event-cards-container:not(:empty) {
            padding-bottom: var(--sl-spacing-small);
        }

        .buttons {
            margin-top: var(--sl-spacing-small);
            display: flex;
            flex-wrap: wrap;
            gap: var(--sl-spacing-x-small);
        }

        .results-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--sl-spacing-medium);
            padding-top: var(--sl-spacing-x-large);
            text-align: center;
        }

        .card-base {
            width: 100%;
            border-radius: var(--sl-border-radius-medium);
            padding: var(--sl-spacing-x-small) var(--sl-spacing-small);
            box-sizing: border-box;
            overflow-wrap: anywhere;
        }

        .card-event {
            background-color: var(--sl-color-neutral-0);
            border: var(--sl-color-neutral-200) solid 1px;
            transition:
                var(--sl-transition-fast) border-color,
                var(--sl-transition-fast) background-color;

            .event-slot[data-ww-drop-over] & {
                background-color: var(--sl-color-neutral-100);
                border-color: var(--sl-color-neutral-300);
            }

            &.card-correct {
                border-color: var(--sl-color-success-500);
                background-color: var(--sl-color-success-50);
            }

            &.card-incorrect {
                border-color: var(--sl-color-danger-500);
                background-color: var(--sl-color-danger-50);
            }

            .quiz-active & {
                cursor: grab;

                @media (hover: hover) {
                    &:hover {
                        border-color: var(--ww-theme-accent-1, var(--sl-color-primary-300));
                        background-color: var(--sl-color-primary-50);
                    }
                }

                &[data-ww-dragging] {
                    border-color: var(--ww-theme-accent-1, var(--sl-color-primary-300));
                    background-color: var(--sl-color-primary-50);
                }
            }
        }

        .card-placeholder {
            background-color: var(--sl-color-neutral-100);
            min-height: calc(1.5em + (var(--sl-spacing-x-small) + 1px) * 2);
            height: 100%;
            transition: var(--sl-transition-fast) background-color;

            [data-ww-drop-over] & {
                background-color: var(--sl-color-neutral-200);
            }
        }

        .dot {
            width: 100%;
            aspect-ratio: 1 / 1;
        }

        .marker {
            display: block;
            margin: 0 auto;
            margin-top: 9px;

            height: 0.5em;
            aspect-ratio: 1 / 1;

            border-radius: 50%;
            background-color: var(--ww-theme-accent-1, black);
            outline: 4px solid white;

            /* Ensures that the dot is above the timeline line */
            position: relative;
            z-index: 1;
        }

        .event-slot:not(:last-child) {
            padding-bottom: var(--sl-spacing-small);
        }

        .card-event:focus-visible {
            outline: var(--sl-focus-ring);
            outline-offset: var(--sl-focus-ring-offset);
        }

        .help-text {
            font-size: var(--sl-font-size-small);
            color: var(--sl-color-neutral-500);
        }

        [data-ww-dragging] {
            cursor: grabbing !important;
        }

        sl-progress-ring {
            --indicator-color: var(--ww-theme-accent-1, var(--sl-color-primary-600));
        }

        /* On paper the quiz is a worksheet: cards to cut out or copy, empty boxes to write the dates into. */
        @media print {
            .help-text,
            .buttons,
            .results-container sl-button {
                display: none;
            }

            .card-base,
            .event-slot,
            .results-container {
                break-inside: avoid;
            }

            .card-event {
                border-color: currentColor;
            }

            .card-placeholder {
                border: 1px solid currentColor;
                min-height: 2.5rem;
                box-sizing: border-box;
            }

            .quiz-container {
                grid-template-columns: calc(50% - 1em) minmax(0, 1fr);
            }
        }
    `;

    /** The language dates are written in. The widget passes its own, since `lang` does not reach into its shadow tree. */
    @property({ type: String })
    accessor language: string = "";

    @property({ type: Array, attribute: true })
    accessor events: QuizEvent[] = [];

    /** Card id → id of the event whose date slot holds it. Cards not listed sit in the tray. */
    @state()
    accessor placements: Record<string, string> = {};

    /** Card ids in their shuffled order. */
    @state()
    accessor order: string[] = [];

    @state()
    accessor checked = false;

    /** Cards can be placed in both modes until the answers are checked: a condition, not a permission. */
    readonly #drag = new Drag(this, { can: () => !this.checked });

    protected willUpdate(changedProperties: PropertyValues): void {
        if (changedProperties.has("events")) {
            // Forget cards and slots of events that no longer exist.
            const ids = new Set(this.events.map((event) => event.id));
            this.placements = Object.fromEntries(
                Object.entries(this.placements).filter(([card, slot]) => ids.has(card) && ids.has(slot)),
            );
            // Add cards for new events at a random position.
            const order = this.order.filter((id) => ids.has(id));
            for (const id of ids) {
                if (!order.includes(id)) order.splice(Math.floor(Math.random() * order.length), 0, id);
            }
            this.order = order;
        }
    }

    protected updated(changedProperties: PropertyValues): void {
        if (!["events", "placements", "checked", "order"].some((name) => changedProperties.has(name))) return;
        const total = this.order.length;
        const correct = this.order.filter((id) => this.placements[id] === id).length;
        const detail = { score: this.checked && total ? correct / total : 0, complete: this.checked };
        this.dispatchEvent(new CustomEvent("quiz-state", { detail }));
    }

    check() {
        this.checked = true;
    }

    reset() {
        this.placements = {};
        this.checked = false;
    }

    private place({ detail }: CustomEvent<DragCommitDetail>) {
        const { key, target, displaced } = detail;
        if (!key) return;
        const next = { ...this.placements };
        // A card that occupied the slot moves to where the dragged card came from.
        const other = displaced?.dataset.wwKey;
        if (other) {
            if (next[key]) next[other] = next[key];
            else delete next[other];
        }
        const slot = target.dataset.slot;
        if (slot) next[key] = slot;
        else delete next[key];
        this.placements = next;
    }

    private EventCard(event: QuizEvent, correct?: boolean) {
        const classes = {
            "card-base": true,
            "card-event": true,
            "card-correct": this.checked && correct === true,
            "card-incorrect": this.checked && correct === false,
        };
        return html`<div
            class=${classMap(classes)}
            part="card"
            data-ww-drag=${this.checked ? nothing : "card"}
            data-ww-key=${event.id}
        >
            ${unsafeHTML(event.titleHtml)}
        </div>`;
    }

    private ResultsContainer() {
        const total = this.order.length;
        const correct = this.order.filter((id) => this.placements[id] === id).length;
        const percentage = (correct / total) * 100;

        return html`<div class="results-container">
            <sl-progress-ring value=${percentage}>${Math.round(percentage)}%</sl-progress-ring>
            <div>
                ${this.msg(html`You got <strong>${correct}</strong> out of <strong>${total}</strong> events correct.`)}
            </div>

            <sl-button @click=${this.reset}>${this.msg("Try Again")}</sl-button>
        </div>`;
    }

    private UnassignedEventsContainer() {
        if (this.checked) return this.ResultsContainer();

        const cards = this.order
            .filter((id) => !this.placements[id])
            .map((id) => this.EventCard(this.events.find((event) => event.id === id)!));

        return html`<div
            class="unassigned-events-container"
            data-ww-drop="card"
            data-ww-label=${this.msg("Unassigned events")}
        >
            <div class="event-cards-container">${cards}</div>

            <div class="help-text">
                ${this.msg("Match the events to their correct dates by dragging and dropping them onto the timeline.")}
            </div>
            <div class="buttons">
                <sl-button variant="primary" @click=${this.check}>${this.msg("Submit answers")}</sl-button>
                <sl-button variant="danger" outline @click=${this.reset}>${this.msg("Reset")}</sl-button>
            </div>
        </div>`;
    }

    private AssignedEventsTimeline() {
        const language = this.language || "en-US";
        const eventSlots = this.events.map((event) => {
            const cardId = this.order.find((id) => this.placements[id] === event.id);
            const card = this.events.find((candidate) => candidate.id === cardId);
            const dates = event.endDate
                ? `${event.date.toLocalizedString(language)} - ${event.endDate.toLocalizedString(language)}`
                : event.date.toLocalizedString(language);

            return html`
                <div class="dot"><span class="marker" part="marker"></span></div>
                <div
                    class="event-slot"
                    data-ww-drop="card"
                    data-ww-drop-max="1"
                    data-ww-drop-full="swap"
                    data-ww-label=${dates}
                    data-slot=${event.id}
                >
                    <div>${dates}</div>
                    <div class="event-cards-container">
                        <div class="card-base card-placeholder"></div>
                        ${card ? this.EventCard(card, cardId === event.id) : nothing}
                    </div>
                </div>
            `;
        });

        return html`<timeline-template exportparts="line">${eventSlots}</timeline-template>`;
    }

    render() {
        if (this.events.length === 0) {
            return html`<div class="empty-quiz">${this.msg("Add an event in the timeline to try the quiz.")}</div>`;
        }

        return html`<div class="quiz-frame">
            <div
                class=${classMap({ "quiz-container": true, "quiz-active": !this.checked })}
                @ww-dragcommit=${this.place}
            >
                ${this.UnassignedEventsContainer()} ${this.AssignedEventsTimeline()}
            </div>
        </div>`;
    }
}
