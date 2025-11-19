import { localized, msg } from "@lit/localize";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlRadioGroup from "@shoelace-style/shoelace/dist/components/radio-group/radio-group.component.js";
import SlRadio from "@shoelace-style/shoelace/dist/components/radio/radio.component.js";
import SlTabGroup from "@shoelace-style/shoelace/dist/components/tab-group/tab-group.component.js";
import SlTabPanel from "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.component.js";
import SlTab from "@shoelace-style/shoelace/dist/components/tab/tab.component.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { LitElementWw } from "@webwriter/lit";
import { css, html, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import EyeSlash from "../assets/icons/eye-slash.svg";
import LOCALIZE from "../localization/generated";
import { QuizContainer, QuizEvent } from "./quiz/quiz-container.component";
import { TimelineContainer } from "./timeline/timeline-container.component";
import type { WebWriterTimelineEventWidget } from "./timeline/webwriter-timeline-event.widget";
import { TimelineDate } from "./util/timeline-date";

@localized()
@customElement("webwriter-timeline")
export class WebWriterTimelineWidget extends LitElementWw {
    localize = LOCALIZE;

    static scopedElements = {
        "sl-button": SlButton,
        "sl-icon": SlIcon,
        "sl-radio-group": SlRadioGroup,
        "sl-radio": SlRadio,
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

        :host(:not([contenteditable="true"]):not([contenteditable=""])) aside {
            display: none;
        }

        sl-tab-panel::part(base) {
            padding: 0;
        }

        .hide {
            display: none;
        }
    `;

    get isInEditView() {
        return this.contentEditable === "true" || this.contentEditable === "";
    }

    private tabGroupRef = createRef<SlTabGroup>();

    @property({ type: String, reflect: true, attribute: "panels" })
    accessor enabledPanels: "timeline" | "quiz" | "timeline+quiz" = "timeline+quiz";

    @state()
    private accessor eventsForQuiz: QuizEvent[] = [];

    private updateEventsForQuiz() {
        this.eventsForQuiz = Array.from(this.children)
            .filter((c) => c instanceof HTMLElement && c.tagName === "WEBWRITER-TIMELINE-EVENT")
            .map((event: WebWriterTimelineEventWidget) => ({
                id: event.id,
                titleHtml: event.querySelector("webwriter-timeline-event-title").innerHTML.trim(),
                date: event.date,
                endDate: event.endDate,
            }))
            .filter((event) => event.date && event.titleHtml);
    }

    private addEvent(event: CustomEvent) {
        event.stopPropagation();
        const newEvent = document.createElement("webwriter-timeline-event");
        this.appendChild(newEvent);
    }

    private dateChanged(event: Event) {
        event.stopPropagation();

        // When the date of an event changes, we need to reorder the events.
        const target = event.target as WebWriterTimelineEventWidget;

        let oldPos = Array.from(this.children).indexOf(target);
        let inserted = false;

        for (const child of this.children) {
            if ("date" in child && child.date) {
                // Move the target before the first event with a date greater than the target's date
                // (i.e. at the end of all events with a date less than or equal to the target's date)
                if (target.date.compare(child.date as TimelineDate) < 0) {
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
        // If no event was found with a date greater than the target's date, append it to the end
        if (!inserted) this.appendChild(target);

        if (oldPos !== Array.from(this.children).indexOf(target)) {
            // For some reason, the element instance actually changes during reordering,
            // so we need to use a timeout and search for the updated instance to trigger the animation.
            setTimeout(() => {
                const updatedTarget = Array.from(this.children).find(
                    (child) => child.id === target.id,
                ) as WebWriterTimelineEventWidget;
                updatedTarget?.showMovedAnimation();
            }, 0);
        }
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        // It is not entirely clear why this is necessary, but without this,
        // no tab is selected when the widget is first rendered in export mode.
        this.tabGroupRef.value?.updateComplete.then(() => this.tabGroupRef.value?.show("timeline"));
    }

    private Options() {
        return html`<aside part="options">
            <sl-radio-group
                value=${this.enabledPanels}
                @sl-change=${(e: CustomEvent) =>
                    (this.enabledPanels = (e.target as SlRadioGroup).value as "timeline" | "quiz" | "timeline+quiz")}
                help-text=${msg("Which panels will be visible to readers")}
            >
                <sl-radio value="timeline+quiz">${msg("Timeline and Quiz")}</sl-radio>
                <sl-radio value="timeline">${msg("Timeline only")}</sl-radio>
                <sl-radio value="quiz">${msg("Quiz only")}</sl-radio>
            </sl-radio-group>
        </aside>`;
    }

    private Quiz() {
        return html`<quiz-container lang=${this.lang} .events=${this.eventsForQuiz}></quiz-container>`;
    }

    private Timeline() {
        return html`<timeline-container
            lang=${this.lang}
            ?edit-view=${this.isInEditView}
            @add-event=${this.addEvent}
            @date-changed=${this.dateChanged}
            @slotchange=${() => this.updateEventsForQuiz()}
        >
            <slot></slot>
        </timeline-container>`;
    }

    private PanelIcon(panelName: string) {
        if (!this.enabledPanels.includes(panelName)) {
            return html`<sl-icon src=${EyeSlash} label=${msg("(disabled)")}></sl-icon>`;
        } else {
            return nothing;
        }
    }

    private TabGroup() {
        if (!this.isInEditView && this.enabledPanels !== "timeline+quiz") {
            if (this.enabledPanels === "timeline") {
                return this.Timeline();
            }
            if (this.enabledPanels === "quiz") {
                // We still need to mount the slot to get a list of events for the quiz
                return html`<slot class="hide" @slotchange=${() => this.updateEventsForQuiz()}></slot>${this.Quiz()}`;
            }
        }

        return html`<sl-tab-group
            ${ref(this.tabGroupRef)}
            tabindex="0"
            activation="manual"
            @sl-tab-show=${(event: CustomEvent) => {
                if (event.detail.name === "quiz") this.updateEventsForQuiz();
            }}
        >
            <sl-tab slot="nav" panel="timeline">${msg("Timeline")}${this.PanelIcon("timeline")}</sl-tab>
            <sl-tab slot="nav" panel="quiz">${msg("Quiz")}${this.PanelIcon("quiz")}</sl-tab>
            <sl-tab-panel name="timeline">${this.Timeline()}</sl-tab-panel>
            <sl-tab-panel name="quiz">${this.Quiz()}</sl-tab-panel>
        </sl-tab-group>`;
    }

    render() {
        return html`${this.Options()}${this.TabGroup()}`;
    }
}
