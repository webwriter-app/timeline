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

@localized()
export class TimelineContainer extends LitElementWw {
    localize = LOCALIZE;

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

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.noEvents = this.slotRef.value?.assignedElements({ flatten: true }).length === 0;
    }

    addEvent() {
        // Since the slot containing the timeline events is managed by the parent widget,
        // we need to dispatch an event to notify the parent to add a new event.
        this.dispatchEvent(new CustomEvent("add-event", { bubbles: true, composed: true }));
    }

    render() {
        return html`<timeline-template>
            ${this.noEvents ? html`<div class="no-events">${msg("No events")}</div>` : nothing}
            <slot
                ${ref(this.slotRef)}
                @slotchange=${(e: Event) => {
                    this.noEvents = (e.target as HTMLSlotElement).assignedElements({ flatten: true }).length === 0;
                }}
            ></slot>
            ${this.isInEditView
                ? html`<div class="add-event">
                      <sl-icon src=${PlusCircleFillIcon}></sl-icon>
                      <sl-button variant="default" size="medium" @click=${this.addEvent}>${msg("Add Event")}</sl-button>
                  </div>`
                : nothing}</timeline-template
        >`;
    }
}
