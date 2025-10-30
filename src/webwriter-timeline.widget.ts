import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTabGroup from "@shoelace-style/shoelace/dist/components/tab-group/tab-group.component.js";
import SlTabPanel from "@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.component.js";
import SlTab from "@shoelace-style/shoelace/dist/components/tab/tab.component.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { LitElementWw } from "@webwriter/lit";
import { css, html, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { TimelineContainer } from "./timeline/timeline-container.component";
import type { WebWriterTimelineEventWidget } from "./timeline/webwriter-timeline-event.widget";

@customElement("webwriter-timeline")
export class WebWriterTimelineWidget extends LitElementWw {
    static scopedElements = {
        "sl-tab-group": SlTabGroup,
        "sl-tab": SlTab,
        "sl-tab-panel": SlTabPanel,
        "sl-icon": SlIcon,
        "sl-button": SlButton,
        "timeline-container": TimelineContainer,
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
        }
    `;

    get isInEditView() {
        return this.contentEditable === "true" || this.contentEditable === "";
    }

    private tabGroup = createRef<SlTabGroup>();

    @property({ type: String, reflect: true, attribute: "panel" })
    accessor currentPanel: "timeline" | "quiz" = "timeline";

    protected async firstUpdated(changed: PropertyValues) {
        if (this.tabGroup.value && changed.has("currentPanel")) {
            await this.tabGroup.value.updateComplete;
            this.tabGroup.value.show(this.currentPanel);
        }
    }

    protected updated(changed: PropertyValues): void {
        if (changed.has("currentPanel")) {
            this.tabGroup.value?.show(this.currentPanel);
        }
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
        const targetDate = new Date(target.date);

        for (const child of this.children) {
            if ("date" in child && child.date) {
                // Move the target before the first event with a date greater than the target's date
                // (i.e. at the end of all events with a date less than or equal to the target's date)
                const childDate = new Date((child as WebWriterTimelineEventWidget).date);
                if (childDate > targetDate) {
                    this.insertBefore(target, child);
                    return;
                }
            } else {
                // Once we reach an event without a date, we can insert the target before it
                // as all previous events have a date less than or equal to the target's date
                this.insertBefore(target, child);
                return;
            }
        }
        // If no event was found with a date greater than the target's date, append it to the end
        this.appendChild(target);
    }

    render() {
        return html`<sl-tab-group
            ${ref(this.tabGroup)}
            @sl-tab-show=${(e: CustomEvent) => (this.currentPanel = e.detail.name)}
            activation="manual"
        >
            <sl-tab slot="nav" panel="timeline">Timeline</sl-tab>
            <sl-tab slot="nav" panel="quiz">Quiz</sl-tab>

            <sl-tab-panel name="timeline">
                <timeline-container
                    ?edit-view=${this.isInEditView}
                    @add-event=${this.addEvent}
                    @date-changed=${this.dateChanged}
                    ><slot></slot
                ></timeline-container>
            </sl-tab-panel>
            <sl-tab-panel name="quiz">Quiz functionality is not yet implemented. </sl-tab-panel>
        </sl-tab-group>`;
    }
}
