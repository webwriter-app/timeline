import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlProgressRing from "@shoelace-style/shoelace/dist/components/progress-ring/progress-ring.component.js";
import { LitElementWw } from "@webwriter/lit";
import { css, PropertyValues } from "lit";
import { html, nothing } from "lit-html";
import { property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { TimelineDate } from "../util/timeline-date";
import { TimelineTemplate } from "../util/timeline-template.component";

export type QuizEvent = {
    id: string;
    titleHtml: string;
    date: TimelineDate;
    endDate: TimelineDate | null;
};

export class QuizContainer extends LitElementWw {
    // We cannot use a custom application/x- MIME type here because
    // mobile browsers do not support them in drag-and-drop operations.
    private static DRAG_DATA_TYPE = "text/plain";

    static scopedElements = {
        "timeline-template": TimelineTemplate,
        "sl-button": SlButton,
        "sl-progress-ring": SlProgressRing,
    };

    static styles = css`
        :host {
            width: 100%;
            display: grid;
            grid-template-columns: calc(50% - 1em) auto;
            gap: 0 0.5em;
            align-items: start;
        }

        .empty-quiz {
            grid-column: 1 / -1;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 5em;
            color: var(--sl-color-neutral-500);
        }

        .unassigned-events-container {
            display: flex;
            flex-direction: column;
            padding: var(--sl-spacing-small) 0;
            gap: var(--sl-spacing-small);
            height: 100%;
            box-sizing: border-box;
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
        }

        .card-event {
            background-color: var(--sl-color-neutral-0);
            border: var(--sl-color-neutral-200) solid 1px;
            transition:
                var(--sl-transition-fast) border-color,
                var(--sl-transition-fast) background-color;

            &.card-correct {
                border-color: var(--sl-color-success-500);
                background-color: var(--sl-color-success-50);
            }

            &.card-incorrect {
                border-color: var(--sl-color-danger-500);
                background-color: var(--sl-color-danger-50);
            }

            &[draggable="true"] {
                cursor: grab;
            }

            &[draggable="true"]:hover {
                border-color: var(--sl-color-primary-300);
                background-color: var(--sl-color-primary-50);
            }
        }

        .card-placeholder {
            background-color: var(--sl-color-neutral-100);
            height: calc(1.5em + (var(--sl-spacing-x-small) + 1px) * 2);
            transition: var(--sl-transition-fast) background-color;

            .drag-over & {
                background-color: var(--sl-color-neutral-200);
            }
        }

        .dot {
            width: 100%;
            aspect-ratio: 1 / 1;
        }

        .dot::before {
            content: "";
            display: block;
            margin: 0 auto;
            margin-top: 9px;

            height: 0.5em;
            aspect-ratio: 1 / 1;

            border-radius: 50%;
            background-color: black;
            outline: 4px solid white;

            /* Ensures that the dot is above the timeline line */
            position: relative;
            z-index: 1;
        }

        .help-text {
            font-size: var(--sl-font-size-small);
            color: var(--sl-color-neutral-500);
        }
    `;

    @property({ type: Array, attribute: true })
    accessor events: QuizEvent[] = [];

    @state()
    accessor assignments: { id: string; assignedToId: string | null }[] = [];

    @state()
    accessor checkAnswers: boolean = false;

    protected update(changedProperties: PropertyValues): void {
        super.update(changedProperties);
        if (changedProperties.has("events")) {
            // Remove assignments for events that no longer exist
            const eventIds = new Set(this.events.map((e) => e.id));
            this.assignments = this.assignments.filter((a) => eventIds.has(a.id));

            // Add assignments for new events, in random order
            for (const event of this.events) {
                if (!this.assignments.find((a) => a.id === event.id)) {
                    const randomIndex = Math.floor(Math.random() * this.assignments.length);
                    this.assignments.splice(randomIndex, 0, { id: event.id, assignedToId: null });
                }
            }

            this.requestUpdate();
        }
    }

    private resetAssignments() {
        for (const assignment of this.assignments) {
            assignment.assignedToId = null;
        }
        this.checkAnswers = false;
        this.requestUpdate();
    }

    private extractEventIdFromDragEvent(e: DragEvent): string | null {
        return e.dataTransfer?.getData(QuizContainer.DRAG_DATA_TYPE) ?? null;
    }

    private EventCard(event: QuizEvent, correct?: boolean) {
        let cardClasses = "card-base card-event";
        if (this.checkAnswers && correct !== undefined) {
            if (correct) cardClasses += " card-correct";
            else cardClasses += " card-incorrect";
        }

        return html`<div
            class="${cardClasses}"
            draggable=${this.checkAnswers === false}
            @dragstart=${(e: DragEvent) => {
                e.dataTransfer?.setData(QuizContainer.DRAG_DATA_TYPE, event.id);
                e.dataTransfer!.effectAllowed = "move";
            }}
        >
            ${unsafeHTML(event.titleHtml)}
        </div>`;
    }

    private ResultsContainer() {
        const total = this.assignments.length;
        const correct = this.assignments.filter((a) => a.assignedToId === a.id).length;
        const percentage = (correct / total) * 100;

        return html`<div class="results-container">
            <sl-progress-ring value=${percentage}>${Math.round(percentage)}%</sl-progress-ring>
            <div>You got <strong>${correct}</strong> out of <strong>${total}</strong> events correct.</div>

            <sl-button @click=${() => this.resetAssignments()}>Try Again</sl-button>
        </div>`;
    }

    private UnassignedEventsContainer() {
        if (this.checkAnswers) return this.ResultsContainer();

        const cards = this.assignments
            .filter((a) => a.assignedToId === null)
            .map((a) => {
                const event = this.events.find((e) => e.id === a.id)!;
                return this.EventCard(event);
            });

        return html`<div
            class="unassigned-events-container"
            @dragover=${(e: DragEvent) => e.preventDefault()}
            @drop=${(e: DragEvent) => {
                e.preventDefault();
                const eventId = this.extractEventIdFromDragEvent(e);
                if (eventId) {
                    const assignment = this.assignments.find((a) => a.id === eventId);
                    assignment!.assignedToId = null;
                    this.requestUpdate();
                }
            }}
        >
            ${cards}

            <div class="help-text">
                Match the events to their correct dates by dragging and dropping them onto the timeline.
            </div>
            <div class="buttons">
                <sl-button variant="primary" @click=${() => (this.checkAnswers = true)} ?disabled=${this.checkAnswers}>
                    Submit answers
                </sl-button>
                <sl-button variant="danger" outline @click=${() => this.resetAssignments()}>Reset</sl-button>
            </div>
        </div>`;
    }

    private AssignedEventsTimeline() {
        const eventSlots = this.events.map((event) => {
            const assignedToThis = this.assignments.find((a) => a.assignedToId === event.id);
            const assignedEvent = this.events.find((e) => e.id === assignedToThis?.id) ?? null;

            // Track how many "nested" dragenter events are active to avoid removing
            // the drag-over class too early
            let dragCounter = 0;

            return html`
                <div class="dot"></div>
                <div
                    @dragenter=${(e: DragEvent) => {
                        (e.currentTarget as HTMLElement).classList.add("drag-over");
                        dragCounter++;
                    }}
                    @dragover=${(e: DragEvent) => {
                        e.preventDefault();
                        e.dataTransfer!.dropEffect = "move";
                    }}
                    @dragleave=${(e: DragEvent) => {
                        dragCounter--;
                        if (dragCounter === 0) (e.currentTarget as HTMLElement).classList.remove("drag-over");
                    }}
                    @drop=${(e: DragEvent) => {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).classList.remove("drag-over");
                        dragCounter = 0;

                        const eventId = this.extractEventIdFromDragEvent(e);
                        if (eventId) {
                            // If a different event was assigned here, unassign it
                            if (assignedToThis) assignedToThis.assignedToId = null;

                            // Assign the dropped event to this slot
                            const assignment = this.assignments.find((a) => a.id === eventId);
                            assignment!.assignedToId = event.id;
                            this.requestUpdate();
                        }
                    }}
                >
                    <div>
                        ${event.date.toLocalizedString(this.lang ?? "en-US")}
                        ${event.endDate ? `- ${event.endDate.toLocalizedString(this.lang ?? "en-US")}` : nothing}
                    </div>
                    ${assignedEvent
                        ? this.EventCard(assignedEvent, assignedToThis.id === assignedToThis.assignedToId)
                        : html`<div class="card-base card-placeholder"></div>`}
                </div>
            `;
        });

        return html`<timeline-template>${eventSlots}</timeline-template>`;
    }

    render() {
        if (this.events.length === 0) {
            return html`<div class="empty-quiz">No events available for this quiz.</div>`;
        }

        return html`${this.UnassignedEventsContainer()}${this.AssignedEventsTimeline()}`;
    }
}
