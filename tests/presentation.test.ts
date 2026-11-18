/// <reference types="mocha" />
import "mocha/mocha.js"
import { assert } from "chai"
import { getMochaConfig } from "@webwriter/build/test"
import "../src/widgets/webwriter-timeline"
import "../src/widgets/webwriter-timeline-event"
import "../src/widgets/webwriter-timeline-event-title"
import "../src/widgets/webwriter-timeline-event-details"
import { frame, wait, mountTimeline, unmountTimeline } from "./helpers"

mocha.setup(getMochaConfig())

describe("<webwriter-timeline> presentation and input", function () {
  this.timeout(30000)
  let timeline: any, root: ShadowRoot, frameEl: HTMLElement

  const eventEl = () => timeline.querySelector("webwriter-timeline-event[date]")
  const marker = () => eventEl().shadowRoot.querySelector(".marker") as HTMLElement
  const line = () => root.querySelector("timeline-container")!.shadowRoot!.querySelector("timeline-template")!.shadowRoot!.querySelector(".line") as HTMLElement
  const tabLine = () => root.querySelector("sl-tab-group")!.shadowRoot!.querySelector("[part~='tabs']")!
  const quiz = () => root.querySelector("quiz-container") as any
  const q = () => quiz().shadowRoot as ShadowRoot
  const setWidth = async (px: number) => { frameEl.style.width = `${px}px`; frameEl.style.maxWidth = "none"; await frame(); await frame() }

  before(async function () {
    timeline = await mountTimeline()
    root = timeline.shadowRoot
    frameEl = timeline.parentElement
  })
  after(unmountTimeline)

  describe("theme", function () {
    it("keeps today's colors without a theme", function () {
      assert.equal(getComputedStyle(marker()).backgroundColor, "rgb(0, 0, 0)")
      assert.equal(getComputedStyle(line()).backgroundColor, "rgb(0, 0, 0)")
      assert.equal(getComputedStyle(tabLine()).borderBottomColor, getComputedStyle(line()).backgroundColor)
      assert.equal(getComputedStyle(root.querySelector("sl-tab-group")!.shadowRoot!.querySelector("[part~='active-tab-indicator']")!).borderBottomColor, "rgba(0, 0, 0, 0)")
    })

    it("follows the document's text color, font and accent colors", async function () {
      frameEl.style.cssText = "--ww-text-color: rgb(1, 2, 3); --ww-font-family: monospace; --ww-theme-accent-1: rgb(18, 52, 86);"
      await frame()
      assert.equal(getComputedStyle(timeline).color, "rgb(1, 2, 3)")
      assert.include(getComputedStyle(timeline).fontFamily, "monospace")
      assert.equal(getComputedStyle(marker()).backgroundColor, "rgb(18, 52, 86)")
      assert.equal(getComputedStyle(line()).backgroundColor, "rgb(18, 52, 86)")
      assert.equal(getComputedStyle(tabLine()).borderBottomColor, getComputedStyle(line()).backgroundColor)
    })

    it("lets a document style the marker part", async function () {
      const style = document.createElement("style")
      style.textContent = "webwriter-timeline-event::part(marker) { width: 17px }"
      document.head.append(style)
      await frame()
      const width = getComputedStyle(marker()).width
      style.remove()
      assert.equal(width, "17px")
    })

    it("exports the line part of the nested template", function () {
      assert.include(root.querySelector("timeline-container")!.getAttribute("exportparts"), "line")
      assert.include(root.querySelector("quiz-container")!.getAttribute("exportparts"), "card")
    })
  })

  describe("responsive layout", function () {
    before(async function () {
      frameEl.style.cssText = ""
      root.querySelector<any>("sl-tab-group").show("quiz"); await wait(300)
    })

    // Stacked when the timeline column starts below the tray, side by side when it starts to its right.
    const stacked = () => {
      const tray = q().querySelector(".unassigned-events-container")!.getBoundingClientRect()
      const template = q().querySelector("timeline-template")!.getBoundingClientRect()
      return template.top >= tray.bottom - 1
    }

    it("holds the widget to 300 px and 2100 px", async function () {
      await setWidth(300)
      assert.equal(timeline.getBoundingClientRect().width, 300)
      await setWidth(3000)
      assert.equal(timeline.getBoundingClientRect().width, 2100, `frame ${frameEl.getBoundingClientRect().width}, window ${innerWidth}`)
    })

    it("stacks tray and timeline of the quiz when narrow, side by side when wide", async function () {
      root.querySelector<any>("sl-tab-group").show("quiz"); await wait(300)
      await setWidth(300)
      assert.isTrue(stacked() && q().querySelector(".quiz-frame")!.getBoundingClientRect().width > 0)
      await setWidth(1000)
      assert.isFalse(stacked(), `active ${root.querySelector<any>("sl-tab-panel[name=quiz]").active} ${(root.querySelector("sl-tab-panel[name=quiz]") as any).outerHTML.slice(0,80)} frame ${frameEl.getBoundingClientRect().width}, quiz ${q().querySelector(".quiz-frame")!.getBoundingClientRect().width}, body ${getComputedStyle(document.body).display}`)
    })

    it("does not scroll sideways at 300 px", async function () {
      await setWidth(300)
      assert.isAtMost(timeline.scrollWidth, timeline.clientWidth + 1)
      root.querySelector<any>("sl-tab-group").show("timeline"); await wait(300)
      assert.isAtMost(timeline.scrollWidth, timeline.clientWidth + 1)
    })

    it("scales authored media inside the details", async function () {
      const details = eventEl()
      details.insertAdjacentHTML("beforeend", '<picture><img alt="" width="900" height="900"></picture>')
      const image = details.querySelector("picture img") as HTMLElement
      await frame()
      const fits = getComputedStyle(image).maxWidth === "100%" && image.getBoundingClientRect().width <= details.shadowRoot.querySelector(".content").getBoundingClientRect().width
      details.querySelector("picture")!.remove()
      assert.isTrue(fits)
    })

    it("has a print view that hides the controls", function () {
      for (const element of [timeline, quiz(), root.querySelector("timeline-container"), eventEl()]) {
        const css = (element.constructor.elementStyles as any[]).flat().map(style => style.cssText).join("")
        assert.include(css, "@media print", element.localName)
      }
    })
  })

  describe("touch", function () {
    const tray = () => q().querySelector(".unassigned-events-container")!
    const cards = () => [...tray().querySelectorAll<HTMLElement>("[data-ww-drag]")]
    const slots = () => [...q().querySelectorAll<HTMLElement>("[data-ww-drop][data-slot]")]
    const center = (el: Element) => { const r = el.getBoundingClientRect(); return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 } }
    const fire = (el: Element, type: string, pos: object) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId: 9, pointerType: "touch", button: 0, isPrimary: true, ...pos }))

    before(async function () {
      await setWidth(1000)
      root.querySelector<any>("sl-tab-group").show("quiz"); await wait(300)
    })

    it("places a card with a touch drag", async function () {
      const card = cards()[0], id = card.dataset.wwKey, total = cards().length
      card.scrollIntoView({ block: "center" }); await frame()
      const from = center(card)
      fire(card, "pointerdown", from)
      fire(card, "pointermove", { clientX: from.clientX + 10, clientY: from.clientY + 10 }); await frame(); await frame()
      const lifted = card.hasAttribute("data-ww-dragging")
      const to = center(slots()[0].querySelector(".card-placeholder")!)
      fire(card, "pointermove", to); await frame(); await frame()
      fire(card, "pointerup", to)
      await wait(450); await quiz().updateComplete
      assert.isTrue(lifted)
      assert.equal(slots()[0].querySelector<HTMLElement>("[data-ww-drag]")?.dataset.wwKey, id)
      assert.equal(cards().length, total - 1)
    })

    it("scrolls the page from anywhere but the cards", function () {
      assert.equal(getComputedStyle(cards()[0]).touchAction, "none")
      assert.equal(getComputedStyle(tray()).touchAction, "auto")
    })

    it("gives the author controls touch-sized targets", async function () {
      root.querySelector<any>("sl-tab-group").show("timeline")
      timeline.setAttribute("contenteditable", ""); await wait(300); await eventEl().updateComplete
      const button = eventEl().shadowRoot.querySelector(".event-selector").getBoundingClientRect()
      const date = eventEl().shadowRoot.querySelector("date-input").getBoundingClientRect()
      assert.isAtLeast(Math.min(button.width, button.height), 24, `${button.width}x${button.height}`)
      assert.isAtLeast(date.height, 24)
    })
  })

  describe("keyboard focus", function () {
    it("focuses a date input with a visible caret and no extra outline", async function () {
      const input = eventEl().shadowRoot.querySelector("date-input").shadowRoot.querySelector("input") as HTMLInputElement
      input.focus(); await frame()
      assert.strictEqual((input.getRootNode() as ShadowRoot).activeElement, input)
      assert.equal(getComputedStyle(input).outlineStyle, "none")
      assert.notInclude(["transparent", "rgba(0, 0, 0, 0)"], getComputedStyle(input).caretColor)
      input.blur()
    })
  })
})

mocha.run()
