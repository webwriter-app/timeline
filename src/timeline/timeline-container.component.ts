import { localizeElement, LocalizedElement } from "../../localization/localizer";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import PlusCircleFillIcon from "bootstrap-icons/icons/plus-circle-fill.svg";
import { css, html, nothing, PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { TimelineTemplate } from "../util/timeline-template.component";

export class TimelineContainer extends LocalizedElement {
    protected readonly messages = localizeElement(this);

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

        timeline-template {
            row-gap: var(--sl-spacing-small);
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

    private ensurePlaceholderEvent() {
        if (!this.isInEditView) return;

        // During editing, ensure that is always a placeholder event that the user can edit
        if (this.slotRef.value?.assignedElements({ flatten: true }).length == 0) {
            this.addEvent();
        }
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.ensurePlaceholderEvent();
    }

    addEvent() {
        // Since the slot containing the timeline events is managed by the parent widget,
        // we need to dispatch an event to notify the parent to add a new event.
        this.dispatchEvent(new CustomEvent("add-event", { bubbles: true, composed: true }));
    }

    render() {
        return html`<timeline-template>
            <slot ${ref(this.slotRef)} @slotchange=${() => this.ensurePlaceholderEvent()}></slot>
            ${this.isInEditView
                ? html`<div class="add-event">
                      <sl-icon src=${PlusCircleFillIcon}></sl-icon>
                      <sl-button variant="default" size="medium" @click=${this.addEvent}>${this.messages.msg("Add Event")}</sl-button>
                  </div>`
                : nothing}</timeline-template
        >`;
    }
}
