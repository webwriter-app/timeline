import { LitElement, html, PropertyValues, css } from "lit";
import { LitElementWw } from "@webwriter/lit";
import { customElement, property, query } from "lit/decorators.js";

import "@shoelace-style/shoelace/dist/themes/light.css";

import {
  SlTab,
  SlTabGroup,
  SlTabPanel,
  SlSelect,
  SlOption,
  SlTabShowEvent,
  SlSwitch,
  SlIcon,
  SlTooltip,
} from "@shoelace-style/shoelace";
import { TimelineDialog } from "../tl-dialog";
import { EventManager } from "../event-manager";
import { MainQuiz } from "../quiz/q-main-quiz";
import IconCirclePlusFilled from "@tabler/icons/outline/circle-plus.svg";
import { HelpOverlay, HelpPopup } from "@webwriter/wui/dist/helpSystem/helpSystem.js";

@customElement("webwriter-timeline")
export class WebWriterTimeline extends LitElementWw {
  @property({ type: Number, attribute: true, reflect: true }) accessor tabIndex = -1;
  @property({ type: Boolean, attribute: true, reflect: true }) accessor quizTabOpen;
  @property({ type: Boolean, attribute: true, reflect: true }) accessor isChecked;
  @property({ type: Number, attribute: true, reflect: true }) accessor quizFeedbackOption;

  @query("#quiz-selection") accessor quizFeedbackSelecter: SlSelect;
  @query("#quiz-component") accessor quiz: MainQuiz;
  @query("#tl-component") accessor dialog: TimelineDialog;
  @query("#quiz-panel") accessor quizPanel: SlTab;
  @query("#quiz-toggle") accessor quizToggle: SlSwitch;
  @query("#feedback-error") accessor feedbackError: HTMLDivElement;
  @query("#add-event-tooltip") accessor addToolTip: SlTooltip;
  @query("#tab-group") accessor tabGroup: SlTabGroup;

  static get styles() {
    return css`
     :host(:not([contenteditable="true"]):not([contenteditable=""]))
        .author-only {
        display: none;
      }
    .ww-timeline {
        border-top: 1px solid darkgray;
        border-bottom: 1px solid darkgray;
        min-height: 500px;
      }
      .border {
        /* height: 500px; */
        min-zoom: 100%;
        overflow-wrap: break-word;
        /* overflow-y: auto; */
        width: 100%;
        padding-left: 20px;
        padding-right: 20px;
        box-sizing: border-box;
        margin-bottom: 20px;
        margin-top: 20px;
      }
      .timeline-container {
        display: flex;
        justify-content: start;
        flex-direction: row;
        position: relative;
        vertical-align: center;
      }
      .timeline {
        min-height: 15px;
        height: auto;
        width: 100%;
        border-left: 2px solid #484848;
        position: relative;
        padding-bottom: 50px;
      }
      /* .timeline-item:last-child {
        margin-bottom: 20px;
      } */
      .timeline::after {
        content: "";
        position: absolute;
        bottom: -10px;
        transform: translateX(-58%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 10px solid #484848;
      }
      .quiz-selection {
        padding-left: 10px;
        width: 100%;
      }
      .add-event-icon {
        position: absolute;
        left: -17px;
        bottom: 0;
        transform: translateY(-15px);
        background-color: white;
        color: #83b9e0;
        font-size: 32px;
      }
      .text-error {
        padding-left: 10px;
        font-size: var(--sl-input-help-text-font-size-medium);
        color: var(--sl-color-danger-700);
      }
    `;
  }

  static get scopedElements() {
    return {
      "event-manager": EventManager,
      "timeline-dialog": TimelineDialog,
      "main-quiz": MainQuiz,
      "sl-tab": SlTab,
      "sl-tab-group": SlTabGroup,
      "sl-tab-panel": SlTabPanel,
      "sl-select": SlSelect,
      "sl-option": SlOption,
      "sl-switch": SlSwitch,
      "sl-icon": SlIcon,
      "sl-tooltip": SlTooltip,
      "webwriter-helpoverlay": HelpOverlay,
      "webwriter-helppopup": HelpPopup,
    };
  }

  private eventManager = new EventManager();

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this.addEventListener("request-remove", (e) =>
      this.eventManager.removeEvent(e)
    );
    this.addEventListener("show-quiz-feedback-error", () =>
      this.feedbackError.hidden = false
    );
  }

  render() {
    return html`
      <sl-tab-group
        class="ww-timeline"
        id="tab-group"
        @sl-tab-show=${(e: SlTabShowEvent) =>
          this.checkSelectedTab(e.detail.name)}
        @sl-tab-hide=${(e: SlTabShowEvent) =>
          this.checkSelectedTab(e.detail.name)}
      >
        <sl-tab 
          slot="nav" 
          panel="timeline-panel"
        > 
          Timeline 
        </sl-tab>
        <sl-tab
          slot="nav"
          panel="quiz-panel"
          id="quiz-panel"
          ?disabled=${!this.isChecked}
        >
          Quiz
        </sl-tab>

        <sl-tab-panel name="timeline-panel">
          <div class="border">
            <div class="timeline-container">
              <div class="timeline">
                <slot name="event-slot"></slot>
                <sl-tooltip
                  content="Click me to add events to the timeline."
                  placement="right"
                  id="add-event-tooltip"
                  hoist
                  style="--show-delay: 1000ms;"
                >
                  <sl-icon
                    src=${IconCirclePlusFilled}
                    class="add-event-icon author-only"
                    id="addButton"
                    class="buttton-left author-only"
                    @click=${this.openingTLDialog}
                  >
                  </sl-icon>
                </sl-tooltip>
              </div>
            </div>

            <timeline-dialog
              id="tl-component"
              class="author-only"
              @request-add=${(e) => this.eventManager.addEvent(e, this)}
            >
            </timeline-dialog>

            <!-- <webwriter-helpoverlay>
                <webwriter-helppopup
                    slot="popupContainer"
                    target="cool-id"
                >
                    <div slot="content">
                        <h4>help heading</h4>
                        <p>some help</p>
                    </div>
                </webwriter-helppopup>
        </webwriter-helpoverlay> -->

            <!-- <div style="width: 50vw, height: 50vh">
                <p id="cool-id">my content</p>
            </div> -->
          </div>
        </sl-tab-panel>

        <sl-tab-panel name="quiz-panel">
          <main-quiz id="quiz-component"></main-quiz>
        </sl-tab-panel>
      </sl-tab-group>

      <div part="options" class="author-only">
        ${this.quizTabOpen
          ? html`<div class="quiz-options" id="quiz-options">
              <sl-select
                id="quiz-selection"
                class="quiz-selection"
                label="Select Quiz Feedback"
                help-text="Please select which feedback the students should get."
                @sl-change=${() => this.saveQuizSelection()}
              >
                <sl-option value="1">Score and Correct Answers</sl-option>
                <sl-option value="2">Correct Answers Only</sl-option>
                <sl-option value="3">Score Only</sl-option>
                <sl-option value="4">None</sl-option>
              </sl-select>
              <div class="text-error" id="feedback-error" hidden>
                Please select a feedback option.
              </div>
            </div>`
          : html` <sl-tooltip
              content="Toggle me to use the timeline quiz-mode in the second tab."
              placement="bottom-start"
              hoist
              style="--show-delay: 1000ms;"
            >
              <sl-switch
                id="quiz-toggle"
                class="quiz-selection"
                @sl-change=${(e) => (this.isChecked = e.target.checked)}
                .checked=${this.isChecked}
              >
                Use Timeline Quiz
              </sl-switch>
            </sl-tooltip>`}
      </div>
    `;
  }
  // if quiz panel is selected start quiz + manage options window
  checkSelectedTab(selectedTab) {
    if (selectedTab === "quiz-panel" && this.isChecked) {
      this.startQuiz();
      this.quizTabOpen = true;
    } else {
      this.quizTabOpen = false;
    }
  }

  // open dialog
  openingTLDialog() {
    this.dialog.showDialog();
  }

  // to do: check for doubles  ... show quiz and add events to it
  startQuiz() {
    this.quiz.startQuiz([...this.children]);
  }

  // transmit selected option for quiz feedback
  saveQuizSelection() {
    this.quizFeedbackOption = Number(this.quizFeedbackSelecter.value);
    if (this.quizFeedbackOption !== undefined || this.quizFeedbackOption !== 0) {
      this.feedbackError.hidden = true;
      this.quiz.retriveSelection(this.quizFeedbackOption);
    } else {
      this.feedbackError.hidden = false;
    }
  }
}
