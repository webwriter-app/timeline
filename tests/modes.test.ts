/// <reference types="mocha" />
import "mocha/mocha.js"
import { assert } from "chai"
import { getMochaConfig } from "@webwriter/build/test"
import "../src/widgets/webwriter-timeline"
import "../src/widgets/webwriter-timeline-event"
import "../src/widgets/webwriter-timeline-event-title"
import "../src/widgets/webwriter-timeline-event-details"
import { wait, waitFor, mountTimeline, unmountTimeline } from "./helpers"
// @ts-expect-error The migration is exported as browser-ready JavaScript.
import { migrateEvent } from "../migrate.js"
import blankSnippet from "../snippets/webwriter-timeline.html"
import womenSnippet from "../snippets/women-in-tech.html"
import olympicsSnippet from "../snippets/history-of-olympic-games.html"

mocha.setup(getMochaConfig())

describe("<webwriter-timeline> modes and languages", function () {
  this.timeout(30000)
  let timeline: any, root: ShadowRoot

  const addEvent = () => root.querySelector("timeline-container")?.shadowRoot!.querySelector<HTMLElement>(".add-event")
  const eventEl = () => timeline.querySelector("webwriter-timeline-event[date]")
  const dateInputs = (): any[] => [...(eventEl().shadowRoot as ShadowRoot).querySelectorAll("date-input")]
  const container = () => timeline.shadowRoot.querySelector("timeline-container")
  const settle = async () => { await wait(100); await timeline.updateComplete }

  before(async function () {
    timeline = await mountTimeline()
    root = timeline.shadowRoot
  })
  after(unmountTimeline)

  describe("authored content", function () {
    it("focuses the empty snippet's Date input when requested, without stealing focus on load", async function () {
      const outside = document.createElement("input")
      document.body.append(outside)
      outside.focus()
      const template = document.createElement("template")
      template.innerHTML = blankSnippet
      const blank = template.content.querySelector<any>("webwriter-timeline")
      blank.setAttribute("contenteditable", "")
      document.body.append(blank)
      try {
        await blank.updateComplete
        assert.strictEqual(document.activeElement, outside)
        blank.focus()
        const event = blank.querySelector("webwriter-timeline-event")
        await waitFor(() => event.shadowRoot?.querySelector("date-input")?.shadowRoot?.activeElement?.localName === "input")
        const input = event.shadowRoot.querySelector("date-input").shadowRoot.activeElement as HTMLInputElement
        assert.isFalse(input.disabled)
        assert.equal(input.selectionStart, 0)
        assert.equal(input.selectionEnd, 0)
        assert.strictEqual(document.activeElement, event)
      }
      finally { blank.remove(); outside.remove() }
    })

    for (const [name, snippet] of [["blank", blankSnippet], ["Women In Tech", womenSnippet], ["Olympic Games", olympicsSnippet]]) {
      it(`uses a single slotted heading and flat flow content in the ${name} snippet`, function () {
        const template = document.createElement("template")
        template.innerHTML = snippet
        const events = template.content.querySelectorAll("webwriter-timeline-event")
        assert.isAbove(events.length, 0)
        for (const event of events) {
          assert.lengthOf(event.querySelectorAll(':scope > h2[slot="title"]'), 1)
          assert.isNull(event.querySelector("webwriter-timeline-event-title, webwriter-timeline-event-details"))
        }
      })
    }

    it("slots exactly one native heading and direct flow children", function () {
      const event = eventEl()
      const heading = event.querySelector('h2[slot="title"]')
      const paragraph = event.querySelector("p")
      assert.lengthOf(event.querySelectorAll(':scope > h2[slot="title"]'), 1)
      assert.strictEqual(heading.assignedSlot, event.shadowRoot.querySelector('slot[name="title"]'))
      assert.equal(getComputedStyle(heading).getPropertyValue("--ww-placeholder").trim(), '"Title"')
      assert.strictEqual(paragraph.assignedSlot, event.shadowRoot.querySelector("slot:not([name])"))
      assert.isNull(event.querySelector("webwriter-timeline-event-title, webwriter-timeline-event-details"))
    })

    it("refreshes the quiz after heading edits and rejects duplicate title slots", async function () {
      const event = eventEl()
      const heading = event.querySelector('h2[slot="title"]')
      const original = heading.textContent
      const quiz = root.querySelector<any>("quiz-container")
      heading.firstChild.textContent = "Updated title"
      await settle()
      assert.equal(quiz.events.find((item: any) => item.id === event.id).titleHtml, "Updated title")
      const duplicate = heading.cloneNode(true)
      event.append(duplicate)
      await settle()
      assert.isFalse(quiz.events.some((item: any) => item.id === event.id))
      duplicate.remove()
      heading.textContent = original
      heading.removeAttribute("slot")
      await settle()
      assert.equal(heading.slot, "title")
      assert.isTrue(quiz.events.some((item: any) => item.id === event.id))
    })

    it("migrates legacy wrappers without losing attributes, nodes or comments", function () {
      const template = document.createElement("template")
      template.innerHTML = '<webwriter-timeline-event date="1815"><!--keep--><webwriter-timeline-event-title id="ada" data-note="title"><em>Ada</em></webwriter-timeline-event-title><webwriter-timeline-event-details><p>Text</p><!--inside--><unknown-content data-test="keep"></unknown-content></webwriter-timeline-event-details></webwriter-timeline-event>'
      const event = template.content.firstElementChild!
      const titleText = event.querySelector("em")!
      const content = event.querySelector("unknown-content")!
      migrateEvent(event)
      assert.strictEqual(event.querySelector('h2[slot="title"] em'), titleText)
      assert.equal(event.querySelector("h2")!.id, "ada")
      assert.equal(event.querySelector("h2")!.getAttribute("data-note"), "title")
      assert.strictEqual(content.parentElement, event)
      assert.isNull(event.querySelector("webwriter-timeline-event-title, webwriter-timeline-event-details"))
      assert.include(event.innerHTML, "<!--keep-->")
      assert.include(event.innerHTML, "<!--inside-->")
      const migrated = event.outerHTML
      migrateEvent(event)
      assert.equal(event.outerHTML, migrated)
    })

    it("preserves attributed legacy details on an ordinary flow element", function () {
      const template = document.createElement("template")
      template.innerHTML = '<webwriter-timeline-event><h2 slot="title">Current</h2><webwriter-timeline-event-details id="details" class="authored"><p>Text</p></webwriter-timeline-event-details></webwriter-timeline-event>'
      const event = template.content.firstElementChild!
      const paragraph = event.querySelector("p")
      migrateEvent(event)
      assert.strictEqual(event.querySelector("div#details.authored > p"), paragraph)
      const current = event.outerHTML
      migrateEvent(event)
      assert.equal(event.outerHTML, current)
    })
  })

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

    it("keeps keyboard focus on the tabs instead of their content wrapper", async function () {
      const group = root.querySelector<HTMLElement>("sl-tab-group")!
      const timelineTab = root.querySelector<HTMLElement>('sl-tab[panel="timeline"]')!
      const quizTab = root.querySelector<HTMLElement>('sl-tab[panel="quiz"]')!
      assert.equal(group.tabIndex, -1)
      timelineTab.focus()
      timelineTab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }))
      await settle()
      assert.equal(root.activeElement, quizTab)
      assert.equal(quizTab.tabIndex, 0)
      quizTab.blur()
    })
  })

  describe("events follow the mode", function () {
    it("shows a selection edge and enabled date inputs in edit mode", async function () {
      timeline.setAttribute("contenteditable", ""); await wait(100); await eventEl().updateComplete
      assert.isTrue(!!eventEl().shadowRoot.querySelector(".event-selector") && dateInputs().length === 2 && dateInputs().every(input => !input.disabled))
      assert.isNull(eventEl().shadowRoot.querySelector("sl-tooltip, sl-icon-button"))
    })

    it("makes details editable in edit mode", function () {
      const paragraph = eventEl().querySelector("p")
      assert.isTrue(!!eventEl().shadowRoot.querySelector("slot:not([name])") && paragraph.isContentEditable)
    })

    it("puts the caret in a newly added event's Date field", async function () {
      const count = timeline.children.length
      addEvent()!.querySelector<HTMLElement>("sl-button")!.click()
      const event = timeline.lastElementChild
      try {
        assert.equal(timeline.children.length, count + 1)
        await waitFor(() => event.shadowRoot?.querySelector("date-input")?.shadowRoot?.activeElement?.localName === "input")
        const input = event.shadowRoot.querySelector("date-input").shadowRoot.activeElement as HTMLInputElement
        assert.isFalse(input.disabled)
        assert.deepEqual([input.selectionStart, input.selectionEnd], [0, 0])
        assert.strictEqual(document.activeElement, event)
      }
      finally { event.remove() }
    })

    it("keeps focus on its native edge control for editor capture without changing authored content", function () {
      const event = eventEl()
      const original = event.innerHTML
      const edge = event.shadowRoot.querySelector("button.event-selector")
      assert.isFalse(edge.draggable)
      assert.equal(edge.getAttribute("aria-label"), "Select event")
      edge.focus()
      edge.click()
      assert.strictEqual(event.shadowRoot.activeElement, edge)
      assert.equal(getComputedStyle(edge).outlineStyle, "none")
      assert.equal(getComputedStyle(dateInputs()[1]).opacity, "1")
      assert.equal(event.innerHTML, original)
      edge.blur()
      document.getSelection()!.removeAllRanges()
    })

    it("gives the edge a pointer target covering the event's content height", function () {
      const event = eventEl()
      const edge = event.shadowRoot.querySelector("button.event-selector")
      const content = event.shadowRoot.querySelector(".content")
      assert.equal(getComputedStyle(edge).cursor, "pointer")
      assert.isAtLeast(edge.getBoundingClientRect().width, 24)
      assert.isAtLeast(edge.getBoundingClientRect().height, content.getBoundingClientRect().height)
    })

    it("keeps the edge indicator and end-date placeholder while selection is inside the event", async function () {
      const event = eventEl()
      const paragraph = event.querySelector("p")
      document.getSelection()!.setPosition(paragraph.firstChild, 1)
      document.dispatchEvent(new Event("selectionchange"))
      await event.updateComplete
      assert.isTrue(event.shadowRoot.querySelector(".dot").hasAttribute("data-selected"))
      assert.equal(getComputedStyle(dateInputs()[1]).opacity, "1")
      assert.equal(getComputedStyle(event.shadowRoot.querySelector(".controls > .show-on-focus")).opacity, "1")
      const hint = event.shadowRoot.querySelector(".reorder-hint")
      assert.equal(hint.textContent, "Change date to reorder")
      assert.equal(getComputedStyle(hint).opacity, "1")
      document.getSelection()!.removeAllRanges()
      document.dispatchEvent(new Event("selectionchange"))
      await event.updateComplete
      assert.isFalse(event.shadowRoot.querySelector(".dot").hasAttribute("data-selected"))
    })

    for (const state of ["ww-element-selected", "ww-element-capture-selected"]) {
      it(`uses native ${state} styling without a text selection or authored changes`, function () {
        const event = eventEl()
        const html = event.outerHTML
        const edge = event.shadowRoot.querySelector(".event-selector")
        const dot = event.shadowRoot.querySelector(".dot")
        const dash = event.shadowRoot.querySelector(".controls > .show-on-focus")
        assert.isFalse(dot.hasAttribute("data-selected"))
        assert.equal(getComputedStyle(dateInputs()[1]).opacity, "0")
        event.selectionStates.add(state)
        try {
          assert.isTrue(event.matches(`:state(${state})`))
          assert.equal(getComputedStyle(edge).backgroundColor, "rgba(0, 90, 158, 0.08)")
          assert.equal(getComputedStyle(dateInputs()[1]).opacity, "1")
          assert.equal(getComputedStyle(dash).opacity, "1")
          assert.equal(getComputedStyle(event.shadowRoot.querySelector(".reorder-hint")).opacity, "1")
          assert.isFalse(dot.hasAttribute("data-selected"))
          assert.equal(event.outerHTML, html)
        }
        finally { event.selectionStates.delete(state) }
        assert.equal(getComputedStyle(dateInputs()[1]).opacity, "0")
        assert.equal(getComputedStyle(edge).backgroundColor, "rgba(0, 0, 0, 0)")
      })
    }

    it("renders the title placeholder with the heading's typography", async function () {
      const heading = eventEl().querySelector('h2[slot="title"]')
      const text = heading.textContent
      const style = heading.getAttribute("style")
      heading.textContent = ""
      heading.style.cssText = "font: italic 600 36px/1.4 serif; letter-spacing: 2px"
      await settle()
      const actual = getComputedStyle(heading)
      const placeholder = getComputedStyle(heading, "::before")
      assert.equal(placeholder.content, '"Title"')
      for (const property of ["font-size", "font-family", "font-weight", "font-style", "line-height", "letter-spacing"]) {
        assert.equal(placeholder.getPropertyValue(property), actual.getPropertyValue(property), property)
      }
      assert.isNull(eventEl().shadowRoot.querySelector(".placeholder"))
      heading.textContent = text
      if (style === null) heading.removeAttribute("style")
      else heading.setAttribute("style", style)
      await settle()
      assert.oneOf(getComputedStyle(heading, "::before").content, ["none", "normal"])
    })

    it("re-renders an event by itself in read mode: no selection edge, date input disabled", async function () {
      timeline.removeAttribute("contenteditable"); await wait(100); await eventEl().updateComplete
      assert.isTrue(dateInputs().length === 1 && dateInputs()[0].disabled)
      assert.isNull(eventEl().shadowRoot.querySelector("button.event-selector"))
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
