import { Permissions } from "@webwriter/lit/permissions";
import { LitElementWw } from "@webwriter/lit";
import { localizer } from "@webwriter/lit/localize";
import { localizeOptions } from "../model/localize-options";
import { css, html, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { createRef, ref } from "lit/directives/ref.js";
import { styleMap } from "lit/directives/style-map.js";
import { DateInput } from "../components/date-input";
import { TimelineDate, timelineDateConverter } from "../model/timeline-date";
import { adoptDetailsMediaStyles } from "../components/details-media-styles";

/**
 * A single event in a `webwriter-timeline` component. Should not be used independently.
 * Contains exactly one `h2[slot="title"]` and flow content in the default slot.
 *
 * @slot title - Exactly one h2 containing the event title.
 * @slot - Authored flow content describing the event.
 * @part marker - The dot on the timeline line.
 * @part edge - The selectable left edge in edit mode.
 * @part reorder-hint - Guidance to change the date to reorder the event.
 */
@customElement("webwriter-timeline-event")
export class WebwriterTimelineEvent extends LitElementWw {
    /** @internal */
    static scopedElements = {
        "date-input": DateInput,
    };

    static styles = css`
        :host {
            width: 100%;
            display: contents !important;
        }

        :host {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
        }

        .dot {
            --event-edge-color: var(--ww-theme-accent-1, black);
            --event-edge-background: transparent;
            position: relative;
            width: 100%;
            align-self: stretch;
        }

        .dot::before {
            content: "";
            position: absolute;
            inset-block: 0;
            inset-inline-start: calc((100% - var(--line-width, 0.125rem)) / 2);
            width: var(--line-width, 0.125rem);
            background-color: var(--event-edge-color);
            pointer-events: none;
        }

        :host(:hover) .dot[data-selectable],
        :host(:focus-within) .dot[data-selectable],
        :host(:state(ww-element-selected)) .dot[data-selectable],
        :host(:state(ww-element-capture-selected)) .dot[data-selectable],
        .dot[data-selectable][data-selected] {
            --event-edge-background: rgb(0 90 158 / 8%);
        }

        .dot[data-selectable]:has(.event-selector:is(:hover, :focus-visible)) {
            --event-edge-color: #005a9e;
            --event-edge-background: rgb(0 90 158 / 18%);
        }

        .dot[data-selectable]:has(.event-selector:active) {
            --event-edge-color: #004578;
            --event-edge-background: rgb(0 69 120 / 28%);
        }

        .event-selector {
            position: absolute;
            inset-block: 0;
            left: 50%;
            translate: -50% 0;
            width: max(100%, 24px);
            min-height: 24px;
            border: 0;
            outline: none;
            border-radius: 2px;
            padding: 0;
            background: var(--event-edge-background);
            cursor: pointer;
            -webkit-user-select: none;
            user-select: none;
        }

        .dot.pulse .marker {
            animation: dot-pulse 600ms ease;
        }

        .marker {
            display: block;
            margin: 0 auto;
            margin-top: 9px;

            height: 10px;
            width: 10px;

            border-radius: 50%;
            background-color: var(--event-edge-color);
            outline: 4px solid white;

            /* Ensures that the dot is above the timeline line */
            position: relative;
            z-index: 1;
            pointer-events: none;
        }

        @keyframes dot-pulse {
            0% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                background-color: var(--ww-theme-accent-2, var(--sl-color-primary-600));
                transform: scale(1.4);
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }

        .controls {
            display: grid;
            grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
            gap: var(--sl-spacing-x-small);
        }

        .date-fields {
            min-inline-size: 0;
            display: flex;
            flex-wrap: wrap;
            gap: var(--sl-spacing-x-small);
            align-items: center;
        }

        .reorder-hint {
            /* Only the date fields determine the row height, even when the hint wraps. */
            contain: size;
            container: timeline-reorder-hint / inline-size;
            display: flex;
            align-items: center;
            justify-content: end;
            min-inline-size: 0;
            color: var(--sl-color-gray-500);
            font-size: 0.6875em;
            line-height: 1;
            text-align: end;
            pointer-events: none;
            user-select: none;
        }

        .reorder-hint > span {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            overflow: clip;
            overflow-wrap: anywhere;
        }

        @container timeline-reorder-hint (inline-size < 6em) {
            .reorder-hint > span {
                display: none;
            }
        }

        .gray-out {
            color: var(--sl-color-gray-500);
        }

        .show-on-focus {
            opacity: 0;
        }

        :hover .show-on-focus,
        :host(:hover) .show-on-focus,
        :focus-within .show-on-focus,
        :host(:focus-within) .show-on-focus,
        :host(:state(ww-element-selected)) .show-on-focus,
        :host(:state(ww-element-capture-selected)) .show-on-focus,
        .content[data-selected] .show-on-focus {
            opacity: 1;
        }

        .hide {
            display: none;
        }

        .content {
            min-width: 0;
            overflow-wrap: break-word;
        }

        slot[data-empty]::slotted(h2)::before {
            content: var(--ww-placeholder);
            font: inherit;
            pointer-events: none;
            user-select: none;
            color: var(--sl-color-gray-500);
        }

        ::slotted(h2[slot="title"]) {
            margin: 0;
            min-block-size: 1lh;
            font: inherit;
            font-weight: bold;
        }

        ::slotted(iframe) {
            box-sizing: border-box;
            max-width: 100%;
        }

        ::slotted(pre) {
            max-width: 100%;
            overflow: auto;
        }

        /* Touch has no hover: show the optional end date, dimmed. */
        @media (hover: none) {
            .show-on-focus:not(.reorder-hint) {
                opacity: 0.6;
            }
        }

        @media print {
            .dot {
                break-inside: avoid;
                --event-edge-color: var(--ww-theme-accent-1, black) !important;
            }

            .event-selector,
            .show-on-focus {
                display: none;
            }
        }
    `;

    localize = localizer(this, localizeOptions);
    protected readonly msg = this.localize.msg;

    readonly #permissions = new Permissions(this);

    /** Native selection states maintained by WebWriter, separate from authored HTML. */
    readonly selectionStates = this.attachInternals().states;

    /**
     * The (start) date of the event.
     * Must be formatted as an ISO 8601 date as "YYYY", "YYYY-MM", or "YYYY-MM-DD".
     * Any year BCE must be represented with a negative year number, with year 0 representing 1 BCE, -1 representing 2 BCE, and so on.
     */
    @property({ type: TimelineDate, attribute: true, reflect: true, converter: timelineDateConverter })
    accessor date: TimelineDate | null = null;

    /**
     * The end date of the event, should be after the start date.
     * Must be formatted as an ISO 8601 date as "YYYY", "YYYY-MM", or "YYYY-MM-DD".
     * Any year BCE must be represented with a negative year number, with year 0 representing 1 BCE, -1 representing 2 BCE, and so on.
     */
    @property({ type: TimelineDate, attribute: true, reflect: true, converter: timelineDateConverter })
    accessor endDate: TimelineDate | null = null;

    private dotElement = createRef<HTMLElement>();

    @state()
    private accessor titleEmpty: boolean = true;

    @state()
    private accessor selectionWithin: boolean = false;

    private titleMutationObserver = new MutationObserver(() => this.checkIfTitleIsEmpty());
    private releaseMediaStyles?: () => void;
    private selectionDocument?: Document;

    private readonly updateSelectionWithin = () => {
        const selection = this.ownerDocument.getSelection();
        this.selectionWithin = !!(this.isConnected && selection?.rangeCount &&
            (this.contains(selection.anchorNode) || this.contains(selection.focusNode) ||
                !selection.isCollapsed && selection.getRangeAt(0).intersectsNode(this)));
    };

    private checkIfTitleIsEmpty() {
        // The editor can recreate the required heading after its deletion.
        const heading = this.querySelector<HTMLHeadingElement>(":scope > h2");
        if (heading && !heading.hasAttribute("slot")) heading.slot = "title";
        const titles = this.querySelectorAll(':scope > h2[slot="title"], :scope > webwriter-timeline-event-title');
        this.titleEmpty = titles.length !== 1 || !titles[0].textContent.trim();
    }

    connectedCallback() {
        super.connectedCallback();
        this.releaseMediaStyles = adoptDetailsMediaStyles(this);
        this.titleMutationObserver.observe(this, {
            childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["slot"],
        });
        this.checkIfTitleIsEmpty();
        this.selectionDocument = this.ownerDocument;
        this.selectionDocument.addEventListener("selectionchange", this.updateSelectionWithin);
        this.updateSelectionWithin();
    }

    disconnectedCallback() {
        this.titleMutationObserver.disconnect();
        this.selectionDocument?.removeEventListener("selectionchange", this.updateSelectionWithin);
        this.selectionDocument = undefined;
        this.releaseMediaStyles?.();
        super.disconnectedCallback();
    }

    focus(options?: FocusOptions) {
        const active = this.ownerDocument.activeElement;
        void this.updateComplete.then(() => {
            if (this.isConnected && this.ownerDocument.activeElement === active && this.#permissions.editing) {
                this.shadowRoot?.querySelector<DateInput>("date-input")?.focus(options);
            }
        });
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        // Check if either date attribute is not yet obfuscated
        // If so, set it to a clone to force an update which will obfuscate the attribute value
        if (this.date && !this.getAttribute("date")?.startsWith("$")) {
            this.date = this.date.clone();
        }
        if (this.endDate && !this.getAttribute("enddate")?.startsWith("$")) {
            this.endDate = this.endDate.clone();
        }
    }

    /** @internal */
    async showMovedAnimation() {
        const dot = this.dotElement.value;
        if (!dot) return;

        dot.classList.remove("pulse");
        // Trigger reflow to restart the animation
        void dot.offsetWidth;
        dot.classList.add("pulse");

        const removePulse = () => {
            dot.classList.remove("pulse");
            dot.removeEventListener("animationend", removePulse);
        };
        dot.addEventListener("animationend", removePulse);
    }

    get isIncomplete() {
        return this.titleEmpty || !this.date;
    }

    render() {
        // Do not display incomplete events outside edit view.
        if (!this.#permissions.editing && this.isIncomplete) {
            return html`<slot name="title" class="hide"></slot><slot class="hide"></slot>`;
        }

        return html`
            <div class="dot" ?data-selectable=${this.#permissions.editing} ?data-selected=${this.selectionWithin} ${ref(this.dotElement)}>
                <span class="marker" part="marker"></span>
                ${this.#permissions.editing
                    ? html`<button type="button" class="event-selector" part="edge" aria-label=${this.msg("Select event")}></button>`
                    : nothing}
            </div>
            <div class="content" ?data-selected=${this.selectionWithin}>
                <div class="controls">
                    <div class="date-fields">
                        <date-input
                            .language=${this.lang}
                            placeholder=${this.msg("Date")}
                            .value=${this.date}
                            ?disabled=${!this.#permissions.editing}
                            @change=${(e: Event) => {
                                if (this.date === (e.target as DateInput).value) return;

                                this.date = (e.target as DateInput).value;
                                // Notify the webwriter-timeline widget that the date has changed
                                // so it can reorder the events.
                                this.updateComplete.then(() =>
                                    this.dispatchEvent(new CustomEvent("date-changed", { bubbles: true, composed: true })),
                                );
                            }}
                        ></date-input>
                        ${this.#permissions.editing || !!this.endDate
                            ? html`<span class=${classMap({ "gray-out": !this.endDate, "show-on-focus": !this.endDate })}>
                                      —
                                  </span>
                                  <date-input
                                      .language=${this.lang}
                                      class=${classMap({ "show-on-focus": !this.endDate })}
                                      placeholder=${this.msg("End date")}
                                      .value=${this.endDate}
                                      ?disabled=${!this.#permissions.editing}
                                      optional
                                      @change=${(event: Event) => {
                                          this.endDate = (event.target as DateInput).value;
                                      }}
                                  ></date-input>`
                            : nothing}
                    </div>
                    ${this.#permissions.editing
                        ? html`<span class="reorder-hint show-on-focus" part="reorder-hint"><span>${this.msg("Change date to reorder")}</span></span>`
                        : nothing}
                </div>
                <slot
                    name="title"
                    ?data-empty=${this.#permissions.editing && this.titleEmpty}
                    style=${styleMap({ "--ww-placeholder": JSON.stringify(this.msg("Title")) })}
                ></slot>
                <slot></slot>
            </div>
        `;
    }
}
