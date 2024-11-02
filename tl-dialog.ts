import {LitElement, html, PropertyValues, css} from "lit"
import {LitElementWw} from "@webwriter/lit"
import {customElement, property} from "lit/decorators.js"

import "@shoelace-style/shoelace/dist/themes/light.css";
import {
  SlButton,
  SlCheckbox,
  SlDialog,
  SlSwitch,
} from "@shoelace-style/shoelace";

import { TimelineInput } from "./tl-input";
import { EventManager } from "./event-manager";
import { EventContainer } from "./event-container";
import { WebWriterTimeline } from "./widgets/webwriter-timeline";
import { TimelineToggle } from "./tl-toggle";
 
@customElement("timeline-dialog")
export class TimelineDialog extends LitElementWw {

  @property({ type: Number, attribute: true, reflect: true }) accessor tabIndex = -1;
  @property({ type: String }) accessor label = "";
  @property({ type: String }) accessor id = "";
  @property({ type: String }) accessor value = "";
  @property({ type: String }) accessor placeholder = "";
  @property({ type: Boolean, reflect: true }) accessor required = false;
  @property({ type: String }) accessor type: "input" | "textarea";
  @property({ type: Boolean }) accessor readToFill = false;
  @property({ type: Boolean }) accessor useTimePeriod = false;

  static styles = css`
   
    sl-dialog::part(base) {
      position: absolute;
      height: 700px;
    }

    sl-dialog::part(overlay) {
      position: absolute;
    }

    .dialog-width{
      width: 100%,
    }

    .timeline-input-container {
      display: grid;
      grid-template-columns: 1fr 1fr; 
      gap: 16px;
      width: 100%;
    }

    timeline-input {
      width: 100%;
      min-width: 0; 
    }

    @media (max-width: 600px) {
      .inputs-container {
        grid-template-columns: 1fr; 
        gap: 8px;
      }
    }

    timeline-input[disabled] {
      --sl-input-label-color: #888888;
    }
  `;

  static get scopedElements() {
    return {      
      "timeline-input": TimelineInput,
      "timeline-toggle": TimelineToggle,
      "event-container": EventContainer,
      "event-manager": EventManager,

      "sl-button": SlButton,
      "sl-checkbox": SlCheckbox,
      "sl-dialog": SlDialog,
      "sl-switch": SlSwitch,
    };

    
  }


  private eventManager = new EventManager();

  protected firstUpdated(_changedProperties: PropertyValues): void {}


  render() {
        return html`
          <sl-dialog id="timelineID" class="dialog-width" label="Add a Timline Event" style="--width: 50vw;">

                <timeline-input type="input" label="Title" id="eventTitle" @sl-change=${this.enableSaveButton} placeholder="Enter the title" required> </timeline-input>
                <timeline-input  type="textarea" label="Description" id="eventDescription" @sl-change=${this.enableSaveButton} placeholder="Enter the description" required> </timeline-input>
                <br />

                <div class="container">
                  <timeline-toggle id="#time-period" .useTimePeriod="${this.useTimePeriod}" @toggle-change="${(e: CustomEvent) => {this.useTimePeriod = e.detail.useTimePeriod;}}"></timeline-toggle>
                  <br />
                  <div class="timeline-input-container">
                    <timeline-input label=${this.useTimePeriod ? "Start date" : "Date"} id="eventStartDate" @sl-change=${this.enableSaveButton} valueAsString required></timeline-input>
                    <timeline-input label="End Date" id="eventEndDate" valueAsString ?disabled=${!this.useTimePeriod}></timeline-input>
                  </div>
                </div>            

              <sl-button class="dialog-footer" id="resetButton" slot="footer" variant="default"  @click="${this.resetDialog}">Reset</sl-button>
              <sl-button id="savingButton" slot="footer" variant="primary"  ?disabled="${!this.readToFill}" @click="${() => this.eventManager.addEvent(this.useTimePeriod)}">Add Event</sl-button>
          </sl-dialog>       
        `;
      } 
      
  // show dialog to enter input
  public showDialog() {
    const dialog = this.shadowRoot?.querySelector(".dialog-width") as SlDialog;
    this.resetDialog();
    dialog.show();
  }

  //hide dialog after saving or closing, call resetDialog()
  public hideDialog() {
    const dialog = this.shadowRoot?.querySelector(".dialog-width") as SlDialog;
    dialog.hide();
  }

  //reset input values 
  resetDialog(){
    const input = this.shadowRoot?.querySelectorAll("timeline-input");
    input.forEach((input: TimelineInput) => {
      input.value = ""; 
    });
    this.useTimePeriod = false;
  }

  //check if input values are empty, if not readToFill = true and #saveButton not disabled
  enableSaveButton(){
    const input_title = this.shadowRoot?.getElementById("eventTitle") as TimelineInput;
    const input_description = this.shadowRoot?.getElementById("eventDescription") as TimelineInput;
    const input_startDate = this.shadowRoot?.getElementById("eventStartDate") as TimelineInput;

    if (input_title.value !== "" && input_description.value !== ""&& input_startDate.value !== "") {
      this.readToFill = true;
    } else {
      this.readToFill = false;
    }
  }
}
