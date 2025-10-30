import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlTooltip from "@shoelace-style/shoelace/dist/components/tooltip/tooltip.component.js";
import { LitElementWw } from "@webwriter/lit";
import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import ExclamationCircleIcon from "../../assets/icons/exclamation-circle.svg";
import TrashIcon from "../../assets/icons/trash.svg";
import { DateInput } from "../date/date-input.component";
import { TimelineDate, timelineDateConverter } from "../date/timeline-date";

@customElement("webwriter-timeline-event")
export class WebWriterTimelineEventWidget extends LitElementWw {
    static scopedElements = {
        "sl-icon-button": SlIconButton,
        "sl-icon": SlIcon,
        "sl-tooltip": SlTooltip,
        "date-input": DateInput,
    };

    static styles = css`
        :host {
            width: 100%;
            display: contents !important;
        }

        .dot {
            width: 100%;
            aspect-ratio: 1 / 1;
        }

        .dot::before {
            content: "";
            display: block;
            justify-self: center;
            margin-top: 12px;

            height: 0.5em;
            aspect-ratio: 1 / 1;

            border-radius: 50%;
            background-color: black;
            outline: 4px solid white;

            /* Ensures that the dot is above the timeline line */
            position: relative;
            z-index: 1;
        }

        input {
            background: unset;
            padding: 0;
            border: none;
            font: inherit;
            display: block;
            outline: none !important;
        }

        .controls {
            display: flex;
            gap: var(--sl-spacing-x-small);
            align-items: flex-end;
        }

        sl-icon {
            margin: auto;
        }

        .spacer {
            flex: 1;
        }

        .gray-out {
            color: var(--sl-color-gray-500);
        }

        .hide {
            display: none;
        }
    `;

    get isInEditView() {
        return this.contentEditable === "true" || this.contentEditable === "";
    }

    @property({ type: TimelineDate, attribute: true, reflect: true, converter: timelineDateConverter })
    accessor date: TimelineDate | null = null;

    @property({ type: TimelineDate, attribute: true, reflect: true, converter: timelineDateConverter })
    accessor endDate: TimelineDate | null = null;

    @state()
    accessor titleEmpty: boolean = true;

    private titleElement = null;
    private titleMutationObserver = new MutationObserver(() => this.checkIfTitleIsEmpty());

    private checkIfTitleIsEmpty() {
        this.titleEmpty = this.titleElement?.textContent === "";
    }

    private onSlotChange(event: Event) {
        this.titleMutationObserver.disconnect();
        this.titleElement = (event.target as HTMLSlotElement)
            .assignedElements()
            .find((e) => e.tagName === "WEBWRITER-TIMELINE-EVENT-TITLE");

        if (this.titleElement) {
            this.checkIfTitleIsEmpty();
            this.titleMutationObserver.observe(this.titleElement, { childList: true });
        }
    }

    render() {
        const isValid = this.date && !this.titleEmpty;

        // Do not render invalid events when not in edit view
        // However, we still need to mount the slot to be able to observe changes
        if (!isValid && !this.isInEditView) return html`<slot @slotchange=${this.onSlotChange} class="hide"></slot>`;

        return html`
            <div class="dot"></div>
            <div>
                <div class="controls">
                    <date-input
                        placeholder="Date"
                        .value=${this.date}
                        ?disabled=${!this.isInEditView}
                        @change=${(e: Event) => {
                            if (this.date === (e.target as DateInput).value) return;

                            this.date = (e.target as DateInput).value;
                            // Notify the webwriter-timeline widget that the date has changed
                            // so it can reorder the events. The timeout is needed to ensure that the
                            // date property is updated before the event is handled.
                            setTimeout(() =>
                                this.dispatchEvent(new CustomEvent("date-changed", { bubbles: true, composed: true })),
                            );
                        }}
                    ></date-input>
                    ${this.isInEditView || !!this.endDate
                        ? html`<span class=${classMap({ "gray-out": !this.endDate })}> — </span>
                              <date-input
                                  placeholder="End date"
                                  .value=${this.endDate}
                                  ?disabled=${!this.isInEditView}
                                  optional
                                  @change=${(event: Event) => {
                                      this.endDate = (event.target as DateInput).value;
                                  }}
                              ></date-input>`
                        : nothing}
                    <span class="spacer"></span>
                    ${!isValid
                        ? html`<sl-tooltip content="An event needs a date and a title" placement="bottom">
                              <sl-icon src=${ExclamationCircleIcon}></sl-icon>
                          </sl-tooltip>`
                        : nothing}
                    ${this.isInEditView
                        ? html`<sl-icon-button
                              src=${TrashIcon}
                              label="Remove"
                              @click=${() => this.remove()}
                          ></sl-icon-button>`
                        : nothing}
                </div>
                <slot @slotchange=${this.onSlotChange}></slot>
            </div>
        `;
    }
}
