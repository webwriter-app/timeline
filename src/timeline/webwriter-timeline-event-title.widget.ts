import { LitElementWw } from "@webwriter/lit";
import { css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

@customElement("webwriter-timeline-event-title")
export class WebWriterTimelineEventTitleWidget extends LitElementWw {
    static styles = css`
        :host {
            font-weight: bold;
            position: relative;
            word-break: break-word;
            overflow-wrap: break-word;
            overflow: hidden;
        }

        .show-placeholder::after {
            content: "Title";
            pointer-events: none;
            position: absolute;
            top: 0;
            left: 0;
            color: var(--sl-color-gray-500);
        }
    `;

    @state()
    private accessor showPlaceholder = true;

    private handleSlotChange(event: Event) {
        this.showPlaceholder =
            (event.target as HTMLSlotElement)
                .assignedNodes()
                .filter(
                    (node) =>
                        !(node.nodeType === Node.ELEMENT_NODE) ||
                        !(node as HTMLElement).classList.contains("ProseMirror-trailingBreak"),
                ).length == 0;
    }

    render() {
        return html`<slot
            class=${classMap({ "show-placeholder": this.showPlaceholder })}
            @slotchange=${this.handleSlotChange}
        ></slot>`;
    }
}
