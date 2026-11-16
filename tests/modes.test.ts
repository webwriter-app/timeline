/// <reference types="mocha" />
import "mocha/mocha.js"
import { assert } from "chai"
import { getMochaConfig } from "@webwriter/build/test"
import "../src/widgets/webwriter-timeline"
import "../src/widgets/webwriter-timeline-event"
import "../src/widgets/webwriter-timeline-event-title"
import "../src/widgets/webwriter-timeline-event-details"
import { wait, waitFor, mountTimeline, unmountTimeline } from "./helpers"

mocha.setup(getMochaConfig())

describe("<webwriter-timeline> modes and languages", function () {
  this.timeout(30000)
  let timeline: any, root: ShadowRoot

  const addEvent = () => root.querySelector("timeline-container")?.shadowRoot!.querySelector<HTMLElement>(".add-event")
  const eventEl = () => timeline.querySelector("webwriter-timeline-event[date]")
  const dateInputs = (): any[] => [...(eventEl().shadowRoot as ShadowRoot).querySelectorAll("date-input")]
  const deleteButton = () => eventEl().shadowRoot.querySelector("sl-icon-button")
  const container = () => timeline.shadowRoot.querySelector("timeline-container")
  const settle = async () => { await wait(100); await timeline.updateComplete }

  before(async function () {
    timeline = await mountTimeline()
    root = timeline.shadowRoot
  })
  after(unmountTimeline)

  describe("panels", function () {
    it("shows readers no tab strip when one panel is enabled", async function () {
      timeline.setAttribute("panels", "quiz"); await settle()
      assert.isTrue(!root.querySelector("sl-tab-group") && !!root.querySelector("quiz-container"))
    })

    it("shows authors both panels, with the disabled one marked", async function () {
      timeline.setAttribute("contenteditable", ""); await settle()
      assert.isTrue(!!root.querySelector("sl-tab-group") && root.querySelectorAll("sl-tab sl-icon").length === 1)
    })

    it("gives a component in the shadow tree the widget's mode instead of inheriting contenteditable", function () {
      assert.isFalse((root.querySelector("timeline-container") as HTMLElement).isContentEditable)
    })

    it("shows authoring controls in edit mode", function () {
      assert.isTrue(addEvent()?.hidden === false && getComputedStyle(addEvent()!).display !== "none")
    })

    it("marks the disabled-panel icon for authors and shows it", function () {
      const icon = root.querySelector<HTMLElement>("sl-tab sl-icon")!
      assert.isTrue(icon.dataset.wwCan === "edit" && !icon.hidden)
    })

    it("brings the strip back in read mode", async function () {
      timeline.removeAttribute("contenteditable"); timeline.setAttribute("panels", "timeline+quiz"); await settle()
      assert.isNotNull(root.querySelector("sl-tab-group"))
    })
  })

  describe("events follow the mode", function () {
    it("shows a delete button and enabled date inputs in edit mode", async function () {
      timeline.setAttribute("contenteditable", ""); await wait(100); await eventEl().updateComplete
      assert.isTrue(!!deleteButton() && dateInputs().length === 2 && dateInputs().every(input => !input.disabled))
    })

    it("makes details editable in edit mode", function () {
      const details = timeline.querySelector("webwriter-timeline-event-details")
      assert.isTrue(!!details.shadowRoot.querySelector("slot") && details.isContentEditable)
    })

    it("re-renders an event by itself in read mode: no delete button, date input disabled", async function () {
      timeline.removeAttribute("contenteditable"); await wait(100); await eventEl().updateComplete
      assert.isTrue(!deleteButton() && dateInputs().length === 1 && dateInputs()[0].disabled)
    })
  })

  describe("languages", function () {
    const addLabel = () => container()?.shadowRoot.querySelector(".add-event sl-button")?.textContent.trim()
    const quizRoot = () => timeline.shadowRoot.querySelector("quiz-container").shadowRoot

    before(async function () {
      timeline.setAttribute("lang", "de"); timeline.setAttribute("contenteditable", "")
      await waitFor(() => addLabel() === "Ereignis hinzufügen")
    })

    it("lets a component inside the widget follow the widget's language", function () {
      assert.equal(addLabel(), "Ereignis hinzufügen")
    })

    it("shows the quiz in German", async function () {
      timeline.shadowRoot.querySelector("sl-tab-group")?.show("quiz"); await wait(200)
      await waitFor(() => quizRoot().querySelector("sl-button[variant=danger]")?.textContent.trim() === "Zurücksetzen")
      assert.equal(quizRoot().querySelector("sl-button[variant=danger]")?.textContent.trim(), "Zurücksetzen")
    })

    it("writes quiz dates in the widget's language", function () {
      assert.match(quizRoot().querySelector(".event-slot > div")?.textContent ?? "", /Dezember|Dez/)
    })

    it("writes the date input's date in the widget's language", function () {
      assert.match(dateInputs()[0].shadowRoot.querySelector("input").value, /Dezember|Dez/)
    })

    it("does not write an inherited language to the document", function () {
      assert.isTrue(!eventEl().hasAttribute("lang") && timeline.getAttribute("lang") === "de")
    })
  })
})

mocha.run()
