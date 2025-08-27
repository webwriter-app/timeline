import { LitElementWw } from "@webwriter/lit";
import { css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

@customElement("webwriter-timeline-event-details")
export class WebWriterTimelineEventDetailsWidget extends LitElementWw {
    static styles = css`
        :host {
            position: relative;
            word-break: break-word;
            overflow-wrap: break-word;
            overflow: hidden;
        }

        .show-placeholder::after {
            content: "Details";
            pointer-events: none;
            position: absolute;
            top: 0;
            left: 0;
            color: var(--sl-color-gray-500);
        }
    `;

    @state()
    private accessor showPlaceholder = false;

    private observedElement = null;
    private mutationObserver = new MutationObserver(
        () => (this.showPlaceholder = this.observedElement.textContent === ""),
    );

    private handleSlotChange(event: Event) {
        const assignedNodes = (event.target as HTMLSlotElement).assignedNodes();
        this.mutationObserver.disconnect();
        if (assignedNodes.length === 1) {
            // If the slot contains exactly one node, we need to check if it's empty,
            // and observe it for changes.
            this.observedElement = assignedNodes[0];
            this.showPlaceholder = this.observedElement.textContent === "";
            this.mutationObserver.observe(this.observedElement, { childList: true });
        } else {
            // If the slot contains more than one node, there is at least some content,
            // so we don't need to show the placeholder.
            this.showPlaceholder = false;
            this.observedElement = null;
        }
    }

    render() {
        return html`<slot
            class=${classMap({ "show-placeholder": this.showPlaceholder })}
            @slotchange=${this.handleSlotChange}
        ></slot>`;
    }
}
