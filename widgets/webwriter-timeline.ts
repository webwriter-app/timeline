import {LitElement, html, PropertyValues, css} from "lit"
import {LitElementWw} from "@webwriter/lit"
import {customElement, property} from "lit/decorators.js"

import "@shoelace-style/shoelace/dist/themes/light.css";

import {
  SlButton,
  SlDialog,
  SlIcon,
} from "@shoelace-style/shoelace";

import { EventContainer } from "../event-container";
import { TimelineInput } from "../tl-input";
import{ TimelineDialog} from "../tl-dialog";
import { EventManager } from "../event-manager";

@customElement("webwriter-timeline")

export class WebWriterTimeline extends LitElementWw {
  @property({ type: Number, attribute: true, reflect: true }) accessor tabIndex = -1;
  
  static get styles() {
    return css`
    .border {
      border: 1px solid lightgray;
      border-radius: 5px;
      min-height: 700px;
      width: 100%,
    }

    #parent >* {
      margin-left: 10px;
    }
    
    h4 {
      text-align: center; 
    }
    
  `;
    
   
  }

  static get scopedElements() {
    return {
      "event-manager": EventManager,
      "event-container": EventContainer,
      "timeline-input": TimelineInput,
      "timeline-dialog": TimelineDialog,
      
      "sl-button": SlButton,
    };
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
  }

  render() {
    return html`
      <div class="border" id="parent">
        <h4>My Timeline</h4>       
        
        <slot></slot>
        <timeline-dialog id="timelineID"></timeline-dialog>
        <sl-button id="addButton" @click=${this.openingTLDialog} >Add Event</sl-button> <br />
      </div>
    `;
  }

  // open dialog, dealing with input and event storage in sub-structures
  openingTLDialog(){
    const dialog = this.shadowRoot?.querySelector("#timelineID") as TimelineDialog;
    dialog.showDialog();
  }

}