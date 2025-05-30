import { html, css } from "lit";
import { LitElementWw } from "@webwriter/lit";
import { customElement, property, query } from "lit/decorators.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { SlIcon } from "@shoelace-style/shoelace";

@customElement("quiz-title")
export class QuizTitles extends LitElementWw {
  @property({ type: Array, attribute: true, reflect: true }) titles;
  @property({ type: Number, attribute: true, reflect: true }) accessor tabIndex = -1;
  @property({ type: Boolean, attribute: true, reflect: true }) accessor titleChildren;
  @query("title-element") accessor title_element: HTMLDivElement;

  static styles = css`
    .border {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: flex-start;
      border: 1px solid #d6d6da;
      background: #f7f7f8;
      border-radius: 5px;
      padding: 10px;
      box-sizing: border-box;
      min-height: 70px;
      width: 100%;
      max-height: 100%;
      height: 100%;
      overflow-y: scroll;
    }
    .dragging {
      background: #e5f4fc;
      border: 2px solid #83b9e0;
    }
  `;

  static get scopedElements() {
    return {
      "sl-icon": SlIcon,
    };
  }

  // randomise title order
  randomiseTitleOrder() {
    [...this.children]
      .sort(() => Math.random() - 0.5)
      .forEach((title) => this.appendChild(title));
  }

  // dispatch CE for handling title drop
  droppingTitles() {
    this.dispatchEvent(
      new CustomEvent("title-dropped-in-titles", {
        detail: { target: this },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html` <div
      id="title"
      class="border"
      lable="Titles"
      @drop=${this.droppingTitles}
    >
      <slot></slot>
    </div>`;
  }
}