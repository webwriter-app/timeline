import { localized, msg } from "@lit/localize";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlProgressRing from "@shoelace-style/shoelace/dist/components/progress-ring/progress-ring.component.js";
import { LitElementWw } from "@webwriter/lit";
import { css, PropertyValues } from "lit";
import { html, nothing } from "lit-html";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import LOCALIZE from "../../localization/generated";
import { TimelineDate } from "../util/timeline-date";
import { TimelineTemplate } from "../util/timeline-template.component";

export type QuizEvent = {
    id: string;
    titleHtml: string;
    date: TimelineDate;
    endDate: TimelineDate | null;
};

type QuizDragState = {
    element: HTMLElement;
    pointerId: number;
    startX: number;
    startY: number;
    dropTarget: HTMLElement | null;
};

@localized()
export class QuizContainer extends LitElementWw {
    protected localize = LOCALIZE;

    /** @internal */
    static scopedElements = {
        "timeline-template": TimelineTemplate,
        "sl-button": SlButton,
        "sl-progress-ring": SlProgressRing,
    };

    static styles = css`
        .quiz-container {
            width: 100%;
            display: grid;
            grid-template-columns: calc(50% - 1em) auto;
            gap: 0 0.5em;
            align-items: start;
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

            .quiz-active & {
                cursor: grab;
                touch-action: none;

                &:hover {
                    border-color: var(--sl-color-primary-300);
                    background-color: var(--sl-color-primary-50);
                }
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

        .dragging {
            z-index: 1000;
            pointer-events: none;
            cursor: grabbing !important;
        }
    `;

    @property({ type: Array, attribute: true })
    accessor events: QuizEvent[] = [];

    @state()
    accessor assignments: { id: string; assignedToId: string | null }[] = [];

    @state()
    accessor checkAnswers: boolean = false;

    protected update(changedProperties: PropertyValues): void {
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
        }
        super.update(changedProperties);
    }

    private resetAssignments() {
        for (const assignment of this.assignments) {
            assignment.assignedToId = null;
        }
        this.checkAnswers = false;
        this.requestUpdate();
    }

    private EventCard(event: QuizEvent, correct?: boolean) {
        let cardClasses = "card-base card-event";
        if (this.checkAnswers && correct !== undefined) {
            if (correct) cardClasses += " card-correct";
            else cardClasses += " card-incorrect";
        }

        return html`<div class="${cardClasses}" data-event-id="${event.id}">${unsafeHTML(event.titleHtml)}</div>`;
    }

    private ResultsContainer() {
        const total = this.assignments.length;
        const correct = this.assignments.filter((a) => a.assignedToId === a.id).length;
        const percentage = (correct / total) * 100;

        return html`<div class="results-container">
            <sl-progress-ring value=${percentage}>${Math.round(percentage)}%</sl-progress-ring>
            <div>
                ${msg(html`You got <strong>${correct}</strong> out of <strong>${total}</strong> events correct.`)}
            </div>

            <sl-button @click=${() => this.resetAssignments()}>${msg("Try Again")}</sl-button>
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

        return html`<div class="unassigned-events-container" data-drop-target>
            ${cards}

            <div class="help-text">
                ${msg("Match the events to their correct dates by dragging and dropping them onto the timeline.")}
            </div>
            <div class="buttons">
                <sl-button variant="primary" @click=${() => (this.checkAnswers = true)} ?disabled=${this.checkAnswers}>
                    ${msg("Submit answers")}
                </sl-button>
                <sl-button variant="danger" outline @click=${() => this.resetAssignments()}>${msg("Reset")}</sl-button>
            </div>
        </div>`;
    }

    private AssignedEventsTimeline() {
        const eventSlots = this.events.map((event, index) => {
            const assignedToThis = this.assignments.find((a) => a.assignedToId === event.id);
            const assignedEvent = this.events.find((e) => e.id === assignedToThis?.id) ?? null;

            return html`
                <div class="dot"></div>
                <div class="event-slot" data-drop-target data-event-index="${index}">
                    <div>
                        ${event.date.toLocalizedString(this.lang || "en-US")}
                        ${event.endDate ? `- ${event.endDate.toLocalizedString(this.lang || "en-US")}` : nothing}
                    </div>
                    ${assignedEvent
                        ? this.EventCard(assignedEvent, assignedToThis?.id === assignedToThis?.assignedToId)
                        : html`<div class="card-base card-placeholder"></div>`}
                </div>
            `;
        });

        return html`<timeline-template>${eventSlots}</timeline-template>`;
    }

    private dragState: QuizDragState | null = null;

    private getDropTargetFromEvent(event: PointerEvent): HTMLElement | null {
        return this.shadowRoot!.elementFromPoint(event.clientX, event.clientY)?.closest("[data-drop-target]") ?? null;
    }

    private onPointerDown(event: PointerEvent) {
        const eventCard = (event.target as HTMLElement).closest?.(".card-event");
        if (!eventCard) return;

        event.preventDefault();
        eventCard.setPointerCapture(event.pointerId);

        eventCard.classList.add("dragging");
        this.dragState = {
            pointerId: event.pointerId,
            element: eventCard as HTMLElement,
            startX: event.clientX + document.documentElement.scrollLeft,
            startY: event.clientY + document.documentElement.scrollTop,
            dropTarget: null,
        };
    }

    private onPointerMove(event: PointerEvent) {
        if (event.pointerId !== this.dragState?.pointerId) return;
        event.preventDefault();

        const { element, startX, startY } = this.dragState;
        const deltaX = event.clientX + document.documentElement.scrollLeft - startX;
        const deltaY = event.clientY + document.documentElement.scrollTop - startY;
        element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        const dropTarget = this.getDropTargetFromEvent(event);
        if (dropTarget !== this.dragState.dropTarget) {
            if (this.dragState.dropTarget) this.dragState.dropTarget.classList.remove("drag-over");
            if (dropTarget) dropTarget.classList.add("drag-over");
        }
        this.dragState.dropTarget = dropTarget;
    }

    private onPointerEnd(event: PointerEvent) {
        if (event.pointerId !== this.dragState?.pointerId) return;

        const dropTarget = this.getDropTargetFromEvent(event);
        if (dropTarget) {
            const dragEventId = this.dragState.element.dataset.eventId;
            const dragAssignment = this.assignments.find((a) => a.id === dragEventId);
            if (dropTarget.classList.contains("unassigned-events-container") && dragAssignment) {
                dragAssignment.assignedToId = null;
                this.requestUpdate();
            }
            if (dropTarget.classList.contains("event-slot") && dragAssignment) {
                const slotEventId = this.events[Number(dropTarget.dataset.eventIndex)].id;
                const slotCurrentAssignment = this.assignments.find((a) => a.assignedToId === slotEventId);
                if (slotCurrentAssignment) slotCurrentAssignment.assignedToId = dragAssignment.assignedToId;

                dragAssignment.assignedToId = slotEventId;
                this.requestUpdate();
            }
        }

        this.dragState.element.classList.remove("dragging");
        this.dragState.element.style.transform = "";
        if (this.dragState.dropTarget) this.dragState.dropTarget.classList.remove("drag-over");
        this.dragState = null;
    }

    render() {
        if (this.events.length === 0) {
            return html`<div class="empty-quiz">${msg("Add an event in the timeline to try the quiz.")}</div>`;
        }

        return html`<div
            class=${classMap({
                "quiz-container": true,
                "quiz-active": !this.checkAnswers,
            })}
            @pointerdown=${this.onPointerDown}
            @pointermove=${this.onPointerMove}
            @pointerup=${this.onPointerEnd}
            @pointercancel=${this.onPointerEnd}
        >
            ${this.UnassignedEventsContainer()} ${this.AssignedEventsTimeline()}
        </div>`;
    }
}
