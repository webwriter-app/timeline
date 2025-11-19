import { LitElementWw } from "@webwriter/lit";
import { css, html } from "lit";

export class TimelineTemplate extends LitElementWw {
    static styles = css`
        :host {
            width: 100%;

            --line-container-width: 1em; /* Width of the container centering the line */
            --line-width: 0.125rem; /* Width of the vertical line */
            --line-spacing: var(--sl-spacing-x-small); /* Space between the line container and the content */

            display: grid;
            grid-template-columns: var(--line-container-width) 1fr;
            gap: 10px var(--line-spacing);

            position: relative; /* For positioning the line */

            box-sizing: border-box;
            padding-top: var(--sl-spacing-x-small);
            padding-bottom: 15px;
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
            bottom: 0;
            transform-origin: bottom right;
            transform: rotate(45deg);

            border-color: black;
            border-style: solid;
            border-width: 0 var(--line-width) var(--line-width) 0;
        }
    `;

    render() {
        return html`<div class="line"></div>
            <slot></slot>`;
    }
}
