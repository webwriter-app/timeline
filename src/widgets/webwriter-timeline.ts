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
import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { QuizContainer, QuizEvent } from "../components/quiz-container";
import { TimelineContainer } from "../components/timeline-container";
import type { WebwriterTimelineEvent } from "./webwriter-timeline-event";
import { TimelineDate } from "../model/timeline-date";
import { Permissions } from "@webwriter/lit/permissions";

/**
 * Displays a timeline with events and a quiz based on those events.
 *
 * As children, it should only contain `<webwriter-timeline-event>` elements in order
 * to function properly. Any other children may lead to unexpected behavior.
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
            width: 100%;
        }

        sl-icon {
            margin-left: var(--sl-spacing-x-small);
        }

        sl-tab-panel::part(base) {
            padding: 0;
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

    @state()
    private accessor eventsForQuiz: QuizEvent[] = [];

    private eventsObserver = new MutationObserver((records) => {
        if (
            records.some(
                ({ target }) =>
                    target === this ||
                    target.parentElement === this ||
                    (target instanceof Element ? target : target.parentElement)?.closest(
                        "webwriter-timeline-event-title",
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
            const titleElement = event.querySelector(":scope > webwriter-timeline-event-title");
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

    private addEvent(event: CustomEvent) {
        event.stopPropagation();
        const newEvent = document.createElement("webwriter-timeline-event");
        this.appendChild(newEvent);
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
        return html`<quiz-container .events=${this.eventsForQuiz} .language=${this.lang}></quiz-container>`;
    }

    private Timeline() {
        return html`<timeline-container
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

        return html`<sl-tab-group ${ref(this.initTabGroup)} tabindex="0" activation="manual">
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
