import { Permissions } from "@webwriter/lit/permissions";
import { LitElementWw } from "@webwriter/lit";
import { localizer } from "@webwriter/lit/localize";
import { localizeOptions } from "../model/localize-options";
import { css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

/**
 * The details of a `webwriter-timeline-event` component. Should not be used independently.
 * As children, it can contain any HTML content representing the details of the event.
 */
@customElement("webwriter-timeline-event-details")
export class WebwriterTimelineEventDetails extends LitElementWw {
    static styles = css`
        :host {
            position: relative;
            word-break: break-word;
            overflow-wrap: break-word;
            overflow: hidden;
        }

        .hide {
            display: none;
        }

        .show-placeholder::after {
            content: var(--placeholder-text);
            pointer-events: none;
            position: absolute;
            top: 0;
            left: 0;
            color: var(--sl-color-gray-500);
        }

        ::slotted(iframe) {
            box-sizing: border-box;
        }
    `;

    localize = localizer(this, localizeOptions);
    protected readonly msg = this.localize.msg;

    readonly #permissions = new Permissions(this);

    @state()
    private accessor isEmpty = false;

    private observedElement: HTMLElement | null = null;
    private mutationObserver = new MutationObserver(() => {
        const observedElement = this.observedElement;
        if (!observedElement) return;

        let empty = observedElement.childNodes.length === 0;
        // If the only child is a trailing break, consider it empty
        if (observedElement.children.length === 1) {
            const child = observedElement.children[0];
            empty = child.tagName === "BR" && child.classList.contains("ProseMirror-trailingBreak");
        }
        this.isEmpty = empty;
    });

    private handleSlotChange(event: Event) {
        const assignedNodes = (event.target as HTMLSlotElement).assignedElements();
        this.mutationObserver.disconnect();
        if (assignedNodes.length === 1) {
            // If the slot contains exactly one node, we need to check if it's empty,
            // and observe it for changes.
            this.observedElement = assignedNodes[0] as HTMLElement;
            this.isEmpty = this.observedElement.textContent === "";
            this.mutationObserver.observe(this.observedElement, { childList: true });
        } else {
            // If the slot contains more than one node, there is at least some content,
            // so we don't need to show the placeholder.
            this.isEmpty = false;
            this.observedElement = null;
        }
    }

    render() {
        return html`<slot
            style="--placeholder-text: '${this.msg("Details")}'"
            class=${classMap({
                "show-placeholder": this.#permissions.editing && this.isEmpty,
                hide: !this.#permissions.editing && this.isEmpty,
            })}
            @slotchange=${this.handleSlotChange}
        ></slot>`;
    }
}
