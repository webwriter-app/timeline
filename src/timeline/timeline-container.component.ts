import { localized, msg } from "@lit/localize";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import { LitElementWw } from "@webwriter/lit";
import { css, html, nothing, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import PlusCircleFillIcon from "../../assets/icons/plus-circle-fill.svg";
import LOCALIZE from "../../localization/generated";
import { TimelineTemplate } from "../util/timeline-template.component";
import type { WebWriterTimelineEventWidget } from "./webwriter-timeline-event.widget";

@localized()
export class TimelineContainer extends LitElementWw {
    protected localize = LOCALIZE;

    /** @internal */
    static scopedElements = {
        "sl-button": SlButton,
        "sl-icon": SlIcon,
        "timeline-template": TimelineTemplate,
    };

    static styles = css`
        .no-events {
            grid-column: 2;
            color: var(--sl-color-neutral-500);
        }

        .add-event {
            display: contents;

            sl-icon {
                align-self: center;
                justify-self: center;

                outline: 4px solid white;

                /* Since the "+" icon is transparent in the middle, we need to set a 
				  background color so that the line doesn't show through */
                background-color: white;
                z-index: 1;
            }

            sl-button {
                width: fit-content;
            }
        }
    `;

    @property({ type: Boolean, attribute: "edit-view" })
    accessor isInEditView: boolean = true;

    private slotRef = createRef<HTMLSlotElement>();
    @state()
    private accessor noEvents: boolean = false;

    private updateNoEvents() {
        let currentEvents = this.slotRef.value?.assignedElements({ flatten: true });
        // Since incomplete events are not rendered when not in edit view,
        // we need to not consider them when checking if there are any events at all.
        if (currentEvents && !this.isInEditView) {
            currentEvents = currentEvents
                .filter((el) => el.tagName === "WEBWRITER-TIMELINE-EVENT")
                .filter((event: WebWriterTimelineEventWidget) => !event.isIncomplete);
        }
        this.noEvents = (currentEvents?.length ?? 0) === 0;
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.updateNoEvents();
    }
    addEvent() {
        // Since the slot containing the timeline events is managed by the parent widget,
        // we need to dispatch an event to notify the parent to add a new event.
        this.dispatchEvent(new CustomEvent("add-event", { bubbles: true, composed: true }));
    }

    render() {
        return html`<timeline-template>
            ${this.noEvents ? html`<div class="no-events">${msg("No events")}</div>` : nothing}
            <slot ${ref(this.slotRef)} @slotchange=${() => this.updateNoEvents()}></slot>
            ${this.isInEditView
                ? html`<div class="add-event">
                      <sl-icon src=${PlusCircleFillIcon}></sl-icon>
                      <sl-button variant="default" size="medium" @click=${this.addEvent}>${msg("Add Event")}</sl-button>
                  </div>`
                : nothing}</timeline-template
        >`;
    }
}
