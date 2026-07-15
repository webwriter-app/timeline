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
    startPageX: number;
    startPageY: number;
    dropTarget: HTMLElement | null;
};

type QuizTransitionSnapshot = {
    cardRects: Map<string, DOMRect>;
    containerHeights: Map<string, number>;
};

@localized()
export class QuizContainer extends LitElementWw {
    protected localize = LOCALIZE;

    private static readonly DROP_TRANSITION_DURATION = 200; //ms
    private static readonly DROP_TRANSITION_EASING = "cubic-bezier(0.2, 0, 0, 1)";

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

            .event-slot.drag-over & {
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

        .event-slot:not(:last-child) {
            padding-bottom: var(--sl-spacing-small);
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

    private EventCardsContainer(containerId: string, cards: unknown) {
        return html`<div class="event-cards-container" data-event-container-id=${containerId}>${cards}</div>`;
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
            ${this.EventCardsContainer("unassigned", cards)}

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
                    ${this.EventCardsContainer(
                        `slot:${event.id}`,
                        html`<div class="card-base card-placeholder"></div>
                            ${assignedEvent
                                ? this.EventCard(assignedEvent, assignedToThis?.id === assignedToThis?.assignedToId)
                                : nothing}`,
                    )}
                </div>
            `;
        });

        return html`<timeline-template>${eventSlots}</timeline-template>`;
    }

    private dragState: QuizDragState | null = null;
    private isTransitioning = false;

    private getDropTargetFromEvent(event: PointerEvent): HTMLElement | null {
        return this.shadowRoot!.elementFromPoint(event.clientX, event.clientY)?.closest("[data-drop-target]") ?? null;
    }

    private onPointerDown(event: PointerEvent) {
        if (this.isTransitioning || this.checkAnswers || this.dragState) return;

        const eventCard = (event.target as HTMLElement).closest?.(".card-event");
        if (!eventCard) return;

        event.preventDefault();
        eventCard.setPointerCapture(event.pointerId);

        eventCard.classList.add("dragging");
        this.dragState = {
            pointerId: event.pointerId,
            element: eventCard as HTMLElement,
            startPageX: event.clientX + document.documentElement.scrollLeft,
            startPageY: event.clientY + document.documentElement.scrollTop,
            dropTarget: null,
        };
    }

    private onPointerMove(event: PointerEvent) {
        if (event.pointerId !== this.dragState?.pointerId) return;
        event.preventDefault();

        const { element, startPageX, startPageY } = this.dragState;
        const deltaX = event.clientX + document.documentElement.scrollLeft - startPageX;
        const deltaY = event.clientY + document.documentElement.scrollTop - startPageY;
        element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        const dropTarget = this.getDropTargetFromEvent(event);
        if (dropTarget !== this.dragState.dropTarget) {
            if (this.dragState.dropTarget) this.dragState.dropTarget.classList.remove("drag-over");
            if (dropTarget) dropTarget.classList.add("drag-over");
        }
        this.dragState.dropTarget = dropTarget;
    }

    private prefersReducedMotion() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    private resetCardTransition(card: HTMLElement) {
        card.style.transform = "";
        card.classList.remove("dragging");
    }

    private captureTransitionSnapshot(): QuizTransitionSnapshot {
        const cardRects = new Map<string, DOMRect>();
        const containerHeights = new Map<string, number>();

        for (const card of this.shadowRoot!.querySelectorAll<HTMLElement>(".card-event")) {
            const eventId = card.dataset.eventId;
            if (eventId) cardRects.set(eventId, card.getBoundingClientRect());
        }
        for (const container of this.shadowRoot!.querySelectorAll<HTMLElement>(".event-cards-container")) {
            const containerId = container.dataset.eventContainerId;
            if (containerId) containerHeights.set(containerId, container.getBoundingClientRect().height);
        }

        return { cardRects, containerHeights };
    }

    private async playReleaseTransition(snapshot: QuizTransitionSnapshot, releasedEventId: string | undefined) {
        await this.updateComplete;
        if (!this.isConnected) return;

        const cards = Array.from(this.shadowRoot!.querySelectorAll<HTMLElement>(".card-event"));
        const containers = Array.from(this.shadowRoot!.querySelectorAll<HTMLElement>(".event-cards-container"));
        for (const card of cards) card.classList.toggle("dragging", card.dataset.eventId === releasedEventId);

        const animationOptions: KeyframeAnimationOptions = {
            duration: QuizContainer.DROP_TRANSITION_DURATION,
            easing: QuizContainer.DROP_TRANSITION_EASING,
        };
        const animations: Animation[] = [];

        if (!this.prefersReducedMotion()) {
            for (const container of containers) {
                const containerId = container.dataset.eventContainerId;
                const firstHeight = containerId ? snapshot.containerHeights.get(containerId) : undefined;
                const finalHeight = container.getBoundingClientRect().height;
                if (firstHeight === undefined || Math.abs(firstHeight - finalHeight) < 0.5) continue;

                animations.push(
                    container.animate(
                        [{ height: `${firstHeight}px` }, { height: `${finalHeight}px` }],
                        animationOptions,
                    ),
                );
            }

            for (const card of cards) {
                const eventId = card.dataset.eventId;
                const firstRect = eventId ? snapshot.cardRects.get(eventId) : undefined;
                if (!firstRect) continue;

                const currentRect = card.getBoundingClientRect();
                const deltaX = firstRect.left - currentRect.left;
                const deltaY = firstRect.top - currentRect.top;
                if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;

                animations.push(
                    card.animate(
                        [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: "none" }],
                        animationOptions,
                    ),
                );
            }
        }

        await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));

        for (const card of cards) this.resetCardTransition(card);
    }

    private async onPointerEnd(event: PointerEvent) {
        if (event.pointerId !== this.dragState?.pointerId) return;

        const dragState = this.dragState;
        this.dragState = null;
        const dropTarget = event.type === "pointerup" ? this.getDropTargetFromEvent(event) : null;
        if (dragState.dropTarget) dragState.dropTarget.classList.remove("drag-over");
        if (dragState.element.hasPointerCapture(event.pointerId))
            dragState.element.releasePointerCapture(event.pointerId);

        const dragEventId = dragState.element.dataset.eventId;
        const dragAssignment = this.assignments.find((assignment) => assignment.id === dragEventId);
        let assignmentChanged = false;
        let applyAssignment = () => {};

        if (dropTarget?.classList.contains("unassigned-events-container") && dragAssignment) {
            assignmentChanged = dragAssignment.assignedToId !== null;
            applyAssignment = () => (dragAssignment.assignedToId = null);
        } else if (dropTarget?.classList.contains("event-slot") && dragAssignment) {
            const slotEventId = this.events[Number(dropTarget.dataset.eventIndex)]?.id;
            if (slotEventId && dragAssignment.assignedToId !== slotEventId) {
                const previousSlotEventId = dragAssignment.assignedToId;
                const slotCurrentAssignment = this.assignments.find(
                    (assignment) => assignment.assignedToId === slotEventId,
                );
                assignmentChanged = true;
                applyAssignment = () => {
                    if (slotCurrentAssignment) slotCurrentAssignment.assignedToId = previousSlotEventId;
                    dragAssignment.assignedToId = slotEventId;
                };
            }
        }

        const snapshot = this.captureTransitionSnapshot();
        dragState.element.style.transform = "";
        this.isTransitioning = true;
        try {
            if (assignmentChanged) {
                applyAssignment();
                this.requestUpdate();
            }
            await this.playReleaseTransition(snapshot, dragEventId);
        } finally {
            this.resetCardTransition(dragState.element);
            this.isTransitioning = false;
        }
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
