import { LitElementWw } from "@webwriter/lit";
import { css, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("webwriter-timeline")
export class WebWriterTimelineWidget extends LitElementWw {
    static scopedElements = {};
    static styles = css``;

    render() {
        return html`Hello, world!`;
    }
}
