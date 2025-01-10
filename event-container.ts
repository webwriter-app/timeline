import { LitElement, html, PropertyValues, css } from "lit";
import { LitElementWw } from "@webwriter/lit";
import { customElement, property, query } from "lit/decorators.js";
import IconTextPlus from "@tabler/icons/outline/text-plus.svg";
import IconArrowsDiagonal from "@tabler/icons/outline/arrows-diagonal.svg";
import IconArrowsDiagonalMinimize2 from "@tabler/icons/outline/arrows-diagonal-minimize-2.svg";
import IconTrash from "@tabler/icons/outline/trash.svg";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { SlButton, SlDetails, SlIcon, SlDialog, SlTooltip  } from "@shoelace-style/shoelace";
import { TlEventData } from "./tl-event-data";
import moment, { Moment } from "moment";

@customElement("event-container")
export class EventContainer extends LitElementWw {

  @property({ type: String }) accessor event_title;
  @property({ type: Array }) accessor event_startDate: TlEventData ["startDate"];
  @property({ type: Array }) accessor event_endDate: TlEventData ["endDate"];
  @property({ type: String }) accessor event_startDate_display_format;
  @property({ type: String }) accessor event_endDate_display;
  @property({ type: Boolean }) accessor hiddenDiv = true;

  @query("#event_elements") accessor event_element;
  @query("#delete-event-dialog") accessor dialog : SlDialog;

  constructor() {
    super();
  } 
  
  static get styles() {
    return css`  
     :host(:not([contenteditable="true"]):not([contenteditable=""]))
        .author-only {
        display: none;
      }
    .event {
      display: flex;
      align-items: flex-start;
      padding: 15px;
      padding-left: 0px;
      position: relative;
      width: 100%;
    }

    .event:first-child {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      padding-top: 5px;
      padding-left: 0px;
      position: relative;
      width: 100%;
    }
    .date-container {
      display: grid;
      align-items: center;
      position: relative;
    }

    .event-date {
      font-size: 14px;
      font-weight: 700;
      color: #484848;
      grid-column: 1;
      grid-row: 1;
      padding-left: 7px;
      padding-right: 5px;
      width: 100%; 
    }

    .date-line {
      min-width:150px;
      flex-grow: 1;
      height: 2px;
      width: 100%; 
      background: #484848;
      display: flex;
      justify-content: space-between;
      align-items: center;
      grid-column: 1;
      grid-row: 2;
      transform: translateX(-3.5px);
    }
    .date-time-period-line {
      min-width:150px;
      flex-grow: 1;
      height: 2px;
      width: 100%; 
      background: #484848;
      display: flex;
      justify-content: space-between;
      align-items: center;
      grid-column: 1;
      grid-row: 2;
      transform: translateX(-3.5px);
    }
    .date-line::before {
      content: "\ ";
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #484848;
    }

    .date-time-period-line::before {
      content: "\ ";
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #484848;
    }

    .event-description-container-closed {
      border: 3px solid #E0E0E0;
      border-radius: 5px;
      padding: 8px;
      display: flex;
      align-items: left;
      justify-content: space-between;
      width: 100%;
      max-width: max-content;
      max-height: 400px;
      overflow-wrap: break-word;
      overflow-y: auto;
      flex-direction: column; 
      transform: translateX(-3.5px);
    }
    .event-description-container-open {
      border: 3px solid #E0E0E0;
      border-radius: 5px;
      padding: 8px;
      display: flex;
      align-items: left;
      justify-content: space-between;
      width: 100%;
      max-width: 100%;
      max-height: 400px;
      overflow-wrap: break-word;
      overflow-y: auto;
      flex-direction: column; 
      transform: translateX(-3.5px);
    }
    .event-title {
      font-size: 16px;
      font-weight: 500;
      text-align: left;
      color: #484848;
      flex: 1;
      padding-right: 7px;
    }

    .event-title-icon {
      flex-direction: row; 
      display: flex; 
      align-items: center;
    }
    .event-trash-can {
      align-self:right; 
      padding-right: 20px;
    }
    .button-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .button {
      padding-top: 5px; 
      width: 100px; 
    }
    .expand-icon {
      padding-right: 15px;
    }
    `;
  }

  static get scopedElements() {
    return {
      "sl-details": SlDetails,
      "sl-button": SlButton,
      "sl-icon": SlIcon,
      "sl-dialog": SlDialog,
      "sl-tooltip": SlTooltip,
    };
  }
  protected firstUpdated(_changedProperties: PropertyValues): void {
    if(this.childElementCount == 0){
      this.addParagraph();
    }
  }
  

  render() {


    return html`
      <div class="event">
        <div class="date-container"> 
        ${this.event_endDate === undefined 
          ? html`
            <div class="event-date">${this.convertToDisplayDate(this.event_startDate).format(this.convertToDisplayDateFormat(this.event_startDate))}</div>
            <div class="date-line"></div>`
          : html`
            <div class="event-date">${this.event_startDate}${" - "}${this.event_endDate}</div>
            <div class="date-time-period-line"></div>`
        }
        </div>

        <div class=${this.hiddenDiv ? "event-description-container-closed" : "event-description-container-open"}>
          <div class="event-title-icon">
            <div 
            class="event-title">${this.event_title}</div>
            ${this.hiddenDiv === false
              ? html`
                <sl-icon 
                    class="author-only event-trash-can" 
                    src=${IconTrash} 
                    slot="prefix"
                    @click="${() => this.dialog.show()}">
                  </sl-icon>`
              : html``
            }
            <sl-icon 
              class=${this.hiddenDiv ? "" : "expand-icon"} 
              .src=${this.hiddenDiv ? IconArrowsDiagonal : IconArrowsDiagonalMinimize2}
              @click=${() => this.showEventContent()}
              slot="prefix">
            </sl-icon>        
          </div>
          <sl-dialog
          id="delete-event-dialog"
          label='Do you want to delete the timeline event "${this.event_title}" ?'>

            <div class="button-container">
              <sl-button 
                class="button" 
                id="closeButton" 
                slot="footer" 
                variant="default"
                @click="${() => this.dialog.hide()}">Exit
              </sl-button>
 
              <sl-button 
                class="button" 
                id="deleteButton" 
                slot="footer" 
                variant="danger" 
                @click="${() => this.removeEvent()}">Delete
              </sl-button>
            </div>
          </sl-dialog>
          <div id="event_elements" class="event-content" hidden>
            <slot></slot> 
          </div>
        </div>
      </div>
    `;
  }

  showEventContent(){
    if(this.event_element.hidden){
      this.event_element.hidden = false; 
      this.hiddenDiv = false;

      if(this.childElementCount == 0){
        this.addParagraph();
      }

    } else {
      this.event_element.hidden = true; 
      this.hiddenDiv = true; 
    }
  }

  setConstructorAttributes(eventData: TlEventData){
    this.event_title = eventData.title;
    this.event_startDate = eventData.startDate;
    this.event_endDate = eventData.endDate;
  }

  // on button press a paragraph with "add description" is added to slot
  addParagraph() {
    const parDescription = document.createElement("p");
    parDescription.textContent = "Modify event details";
    this.appendChild(parDescription);
  }

  // on button press event will be removed form slot
  removeEvent() {
    this.dispatchEvent(
      new CustomEvent("request-remove", {
        detail: { id: this.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  // convert string into date for sorting dates
  getStartDate(): Moment {    
    debugger; 
    

    return this.convertToDisplayDate(this.event_startDate);
   
    // return moment(this.event_startDate)

    // let startDay, startMonth, startYear = "";

    // if(this.event_startDate.includes(" BCE")){
    //   this.event_startDate = this.event_startDate.replace(" BCE","BCE");
    // }
    // const parts:  String[] = this.event_startDate.split(" ", -1);
    // const spaceCount: Number = parts.length - 1;
    
    // if(spaceCount === 0){
    //   startDay = "";
    //   startMonth = "";
    //   startYear = this.event_startDate;
    // } else if( spaceCount === 1){
    //   startDay = "";
    //   [startMonth, startYear] = this.event_startDate.split(" ");
    // } else if ( spaceCount === 2 ){
    //   [startDay, startMonth, startYear] = this.event_startDate.split(" ");
    // }

    // if(startYear.includes("BCE")) {
    //   startYear = startYear.replace("BCE","");
    //   startYear = "-" + startYear;
    // }

    // let sortStartDate = `${startYear}${
    //   startMonth ? `-${startMonth}` : ""
    // }${startDay ? `-${startDay}` : ""}`;

    // console.log( sortStartDate, " date ready to sort")
    // var date = new Date(Date.parse(sortStartDate));
    // console.log(date, " sorting date" );
    // return date;
  }

  convertToDisplayDate (date: TlEventData["startDate"]){
    debugger;
    const [year, month, day] = date;

    const result = moment(0)
    
    if(year != null) {
      result.year(year);
    }
    if(month != null) {
      result.month(month);
    }
    if(day != null) {
      result.day(day);
    }
  
    return result
  }

  convertToDisplayDateFormat (date: TlEventData["startDate"]){
    debugger;
    const [year, month, day] = date;
    const yearBCE = this.checkForYearBC(date);
    let result = "y";
    
    if(month != null && yearBCE === true) {
      result = "MMMM y NN" ;
    } else if(month != null) {
      result = "MMMM y" ;
    }
    if(day != null && yearBCE === true) {
      result = "DD. MMMM y NN" ;
    } else if(day != null) {
      result = "DD. MMMM y" ;
    }
    
    return result
  }

  checkForYearBC(date: TlEventData["startDate"]){
    const [year, month, day] = date;
    if(year.toString().includes("-")) {
      return true;
    }
    return false; 
  }
}