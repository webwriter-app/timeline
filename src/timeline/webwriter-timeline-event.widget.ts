import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import { LitElementWw } from "@webwriter/lit";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import TrashIcon from "../../assets/icons/trash.svg";

@customElement("webwriter-timeline-event")
export class WebWriterTimelineEventWidget extends LitElementWw {
    static scopedElements = {
        "sl-icon-button": SlIconButton,
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

        .spacer {
            flex: 1;
        }

        .gray-out {
            color: #757575;
        }
    `;

    get isInEditView() {
        return this.contentEditable === "true" || this.contentEditable === "";
    }

    @property({ type: String, attribute: true, reflect: true })
    accessor date: string;

    @property({ type: String, attribute: true, reflect: true })
    accessor endDate: string;

    render() {
        return html`
            <div class="dot"></div>
            <div>
                <div class="controls">
                    <input
                        type="date"
                        name="date"
                        .value=${this.date}
                        class=${classMap({ "gray-out": !this.date })}
                        ?disabled=${!this.isInEditView}
                        @change=${(e: Event) => {
                            if (this.date === (e.target as HTMLInputElement).value) return;

                            this.date = (e.target as HTMLInputElement).value;
                            // Notify the webwriter-timeline widget that the date has changed
                            // so it can reorder the events. The timeout is needed to ensure that the
                            // date property is updated before the event is handled.
                            setTimeout(() =>
                                this.dispatchEvent(new CustomEvent("date-changed", { bubbles: true, composed: true })),
                            );
                        }}
                    />
                    ${this.isInEditView || !!this.endDate
                        ? html`<span class=${classMap({ "gray-out": !this.endDate })}>to</span>
                              <input
                                  type="date"
                                  name="endDate"
                                  .value=${this.endDate}
                                  class=${classMap({ "gray-out": !this.endDate })}
                                  ?disabled=${!this.isInEditView}
                                  @change=${(event: Event) => {
                                      this.endDate = (event.target as HTMLInputElement).value;
                                  }}
                              />`
                        : nothing}
                    ${this.isInEditView
                        ? html`<span class="spacer"></span>
                              <sl-icon-button
                                  src=${TrashIcon}
                                  label="Remove"
                                  @click=${() => this.remove()}
                              ></sl-icon-button>`
                        : nothing}
                </div>
                <slot></slot>
            </div>
        `;
    }
}
