import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import PlusCircleFillIcon from "../../assets/icons/plus-circle-fill.svg";

@customElement("timeline-container")
export class TimelineContainer extends LitElement {
    static styles = css`
        :host {
            width: 100%;

            --line-container-width: 1em; /* Width of the container centering the line */
            --line-width: 0.125rem; /* Width of the vertical line */
            --line-spacing: var(--sl-spacing-small); /* Space between the line container and the content */

            display: grid;
            grid-template-columns: var(--line-container-width) 1fr;
            gap: 10px var(--line-spacing);

            position: relative; /* For positioning the line */

            box-sizing: border-box;
            padding-bottom: 10px;
        }

        .line {
            position: absolute;
            top: 0;
            bottom: 0;
            left: calc((var(--line-container-width) - var(--line-width)) / 2);
            width: var(--line-width);

            background-color: black;
        }

        /* Arrow tip at the end (bottom) of the line */
        .line::after {
            --size: 8px;

            content: "";
            display: block;
            position: absolute;

            width: var(--size);
            height: var(--size);

            right: calc(var(--line-width) / 2);
            bottom: calc(var(--line-width) / -2);
            transform-origin: bottom right;
            transform: rotate(45deg);

            border-color: black;
            border-style: solid;
            border-width: 0 var(--line-width) var(--line-width) 0;
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

    @property({ type: Boolean, attribute: "editview" })
    isInEditView: boolean = true;

    addEvent() {
        // Since the slot containing the timeline events is managed by the parent widget,
        // we need to dispatch an event to notify the parent to add a new event.
        this.dispatchEvent(new CustomEvent("add-event", { bubbles: true, composed: true }));
    }

    render() {
        return html`<div class="line"></div>
            <slot></slot>
            ${this.isInEditView
                ? html`<div class="add-event">
                      <sl-icon src=${PlusCircleFillIcon}></sl-icon>
                      <sl-button variant="default" size="medium" @click=${this.addEvent}>Add event</sl-button>
                  </div>`
                : ""}`;
    }
}
