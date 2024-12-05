import { LitElement, html, PropertyValues, css, svg } from "lit";
import { LitElementWw } from "@webwriter/lit";
import { customElement, property, query } from "lit/decorators.js";

import "@shoelace-style/shoelace/dist/themes/light.css";

import {
  SlButton,
  SlSelect,
  SlOption,
  SlRadioGroup,
  SlRadio,
} from "@shoelace-style/shoelace";

import { WebWriterTimeline } from "../widgets/webwriter-timeline";
import { QuizTitles } from "./q-titles";
import { QuizDateField } from "./q-date-field";

@customElement("main-quiz")
export class MainQuiz extends LitElementWw {
  
  @property({ type: Number, attribute: true, reflect: true }) accessor tabIndex = -1;
  @property({ type: Array, attribute: true, reflect: true }) accessor appendedEvents: Array<{ date: string; title: string }> = [];
  @property({ type: Array, attribute: true, reflect: true }) accessor droppedTitles =[];
  @property({ type: Number, attribute: true, reflect: true }) accessor matchCount = 0;
  @property({ type: Number, attribute: true, reflect: true }) accessor score;
  @property({ type: Number, attribute: true, reflect: true }) accessor quizSelection;
  @property({ type: Boolean, attribute: true, reflect: true }) accessor button_checked = false;


  @query("#date-container") accessor date_container: QuizDateField;
  @query("#title-container") accessor title_container: QuizTitles;
  @query("#score-feedback") accessor score_feedback: HTMLParagraphElement;
  @query("#quiz-selection") accessor quiz_selection: SlSelect;
  @query("#check-button") accessor check_button: SlSelect;


  static get styles() {
    return css`
      .border {
        border: 1px solid lightgray;
        border-radius: 5px;
        min-height: 700px;
        width: 100%;
        padding-left: 10px;
        padding-right: 10px;
        box-sizing: border-box;
      }
      h4 {
        text-align: center;
      }
      .quiz-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        width: 100%;
        min-height: 200px;
        border: 1px solid grey;
        flex-direction: column;
      }
      .date-box, .title-box {
        border: 1px solid #ccc;
        padding: 10px;
        text-align: center;
        cursor: pointer;
      }
      .quiz-options{
        display: flex; 
      }
    `;
  }

  static get scopedElements() {
    return {
      "webwriter-timelin": WebWriterTimeline,
      "sl-button": SlButton,
      "sl-option": SlOption,
      "sl-select": SlSelect,
      "sl-radio-group": SlRadioGroup,
      "sl-radio": SlRadio,
      "quiz-title":QuizTitles,
      "quiz-date-field":QuizDateField,
    };
  }

  render() {
    return html`
      <div class="border" id="parent">
        <h4>My Quiz</h4>
        <p>Drag the correct title to the drop section</p>

        <div class="quiz-options" id="quiz-options">
          <sl-select 
            id="quiz-selection" 
            label="Select Quiz Feedback" 
            help-text="Please select which feedback the students should get." 
            @sl-change="${this.saveQuizSelection}">
            <sl-option value="1">Score and Correct Answers</sl-option>
            <sl-option value="2">Correct Answers Only</sl-option>
            <sl-option value="3">Score Only</sl-option>
            <sl-option value="4">None</sl-option>
          </sl-select>
        </div>

        <div class="quiz-container">
          <quiz-date-field id="date-container"></quiz-date-field>
          <quiz-title id="title-container"></quiz-title>
        </div>
        <br />
         
        ${(this.quizSelection === 1 || this.quizSelection === 3) && this.score !== undefined
          ? html`<p id="score-feedback">Your Score: ${this.score + " %"}</p>`
          : ''}
        
        <br />
        <br />

        <sl-button id="check-matches"   
          @click="${() => {
              this.checkMatch();
              this.calculateScore();
              this.button_checked = true;
          }}"
          ?disabled=${this.droppedTitles.length === 0}>Check Match
        </sl-button>
        
        <sl-button 
          @click="${this.resetAnswers}">Reset Quiz
        </sl-button>

        <sl-button 
          @click="${this.endQuiz}">End Quiz
        </sl-button>
      </div>
    `;
  }

  endQuiz() {
    this.resetQuiz();
    this.dispatchEvent(
      new CustomEvent("request-close-quiz", {
        bubbles: true,
        composed: true,
      })
    );
  }

  resetQuiz() {
    this.resetAnswers();
    this.date_container.innerHTML = "";
    this.title_container.innerHTML = "";
  
    this.appendedEvents = [];
    this.droppedTitles = [];
    
  }

  resetAnswers(){
    const drop_section = this.date_container.shadowRoot.querySelectorAll(".drop-section");
    drop_section.forEach(section => {
      section.removeAttribute('dropped');
      section.removeAttribute('quiz-result');
      section.innerHTML = "";
    });

    const date_attacher = this.date_container.shadowRoot.querySelector("#date");
    date_attacher.innerHTML= "";
    this.appendedEvents.forEach(event => {
      this.initializeDate(event.date); 
    });

    const title_attacher = this.title_container.shadowRoot.querySelector("#title");
    title_attacher.innerHTML= "";
    this.appendedEvents.forEach(event => {
      this.initializeTitle(event.title); 
    });
    this.droppedTitles = [];
    this.matchCount = 0; 
    this.score = 0; 
    this.quizSelection = 0;
    // this.button_checked = false; 
  }

  getAppendedEvents() {
    return this.appendedEvents;
  }

  addEventElements(date, title) {
    this.initializeDate(date);
    this.initializeTitle(title);
    this.appendedEvents.push({ date, title });
  }

  initializeDate(date){
    const date_attacher = this.date_container.shadowRoot.querySelector("#date");
    
    const date_element = document.createElement("div");
    date_element.textContent = date;
    date_element.classList.add("date-border");

    const date_drop_section = document.createElement("section");
    date_drop_section.classList.add("drop-section");
    date_drop_section.id = `drop-section-${date}`;

    date_drop_section.addEventListener('dragover', (event: DragEvent) => {
      event.preventDefault();
      date_drop_section.setAttribute('dragover', 'true');
    });

    date_drop_section.addEventListener('dragleave', () => {
      date_drop_section.removeAttribute('dragover');
    });

    date_drop_section.addEventListener('drop', (event: DragEvent) => {
      event.preventDefault();
      date_drop_section.removeAttribute('dragover');
      date_drop_section.setAttribute("dropped", "true");

      const data = event.dataTransfer?.getData("text");
      if (data) {
        this.dropTitle(data, date_drop_section, date);
      }
    });
    date_attacher.appendChild(date_element);
    date_attacher.appendChild(date_drop_section);
  }

  initializeTitle(title){
    const title_attacher = this.title_container.shadowRoot.querySelector("#title");

    const title_element = document.createElement("div");
    title_element.textContent = title;
    title_element.classList.add("title-border");
    title_element.setAttribute("draggable", "true");

    title_element.id = `title-${title}`; 

    title_element.addEventListener('dragstart', (event: DragEvent) => {
      title_element.setAttribute('dragging', 'true');
      event.dataTransfer?.setData("text/plain", title_element.id);
    });

    title_element.addEventListener('dragend', () => {
      title_element.removeAttribute('dragging');
    });

    title_attacher.appendChild(title_element);
    this.randomiseTitleOrder(title_attacher);
  }

  dropTitle(titleId, dropSection, dropDate) {
    const draggedElement = this.title_container.shadowRoot.getElementById(titleId);
    
    if (draggedElement) {
      draggedElement.parentElement.removeChild(draggedElement);
      dropSection.appendChild(draggedElement);
      this.droppedTitles = [...this.droppedTitles, { element: draggedElement, dropSection, dropDate }]
    }
}
  
checkMatch() {
  this.droppedTitles.forEach(({ element, dropSection, dropDate }) => {

    const titleId = element.id;
    const matchFound = this.appendedEvents.find(event => 
        `title-${event.title}` === titleId && event.date === dropDate
    );
    if (matchFound) {
      if(this.quizSelection === 1|| this.quizSelection ===2){
        element.setAttribute('quiz-result', 'match');
        dropSection.setAttribute('quiz-result', 'match'); 
      }
      this.matchCount++;
    } else {
      if(this.quizSelection === 1|| this.quizSelection ===2){
        element.setAttribute('quiz-result', 'mismatch');
        dropSection.setAttribute('quiz-result', 'mismatch'); 
      }
    }
  });
}

  randomiseTitleOrder(title_attacher) {
    const titles = Array.from(title_attacher.children);
    titles.sort(() => Math.random() - 0.5);
    title_attacher.innerHTML = "";
    titles.forEach((box) => title_attacher.appendChild(box));
  }

  calculateScore(){
    const achievedPoints = this.matchCount;
    const possiblePoints = this.appendedEvents.length;
    this.score = parseFloat(((achievedPoints / possiblePoints) * 100).toFixed(2));    
  }

  saveQuizSelection(event){
    const select = event.target as SlSelect;
    this.quizSelection = Number(select.value);
  }
 
}

