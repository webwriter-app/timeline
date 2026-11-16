import { LitElementWw } from "@webwriter/lit";
import { widgetMsg } from "@webwriter/lit/localize";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import PlusCircleFillIcon from "@tabler/icons/filled/circle-plus.svg";
import { css, html, PropertyValues } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { TimelineTemplate } from "./timeline-template";
import { Permissions } from "@webwriter/lit/permissions";

export class TimelineContainer extends LitElementWw {
    protected readonly msg = widgetMsg(this);

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

    /** Inside the widget's shadow tree the mode is the widget's; `data-ww-can="edit"` shows the authoring controls. */
    readonly #permissions = new Permissions(this);

    private slotRef = createRef<HTMLSlotElement>();

    private ensurePlaceholderEvent() {
        if (!this.#permissions.editing) return;

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
            <div class="add-event" data-ww-can="edit">
                <sl-icon src=${PlusCircleFillIcon}></sl-icon>
                <sl-button variant="default" size="medium" @click=${this.addEvent}>${this.msg("Add Event")}</sl-button>
            </div></timeline-template
        >`;
    }
}
