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

describe("<webwriter-timeline> quiz in read mode", function () {
  this.timeout(30000)
  let timeline: any, root: ShadowRoot, quiz: any, q: ShadowRoot, total: number
  const seen: string[] = []

  const tray = () => q.querySelector(".unassigned-events-container")!
  const trayCards = () => [...tray().querySelectorAll<HTMLElement>("[data-ww-drag]")]
  const slots = () => [...q.querySelectorAll<HTMLElement>("[data-ww-drop][data-slot]")]
  const cardIn = (slot: Element) => slot.querySelector<HTMLElement>("[data-ww-drag]")?.dataset.wwKey
  const addEvent = () => root.querySelector("timeline-container")?.shadowRoot!.querySelector<HTMLElement>(".add-event")
  const center = (el: Element) => { const r = el.getBoundingClientRect(); return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 } }
  const fire = (el: Element, type: string, pos: object) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, cancelable: true, pointerId: 7, button: 0, isPrimary: true, ...pos }))
  const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true, cancelable: true }))

  async function drag(card: HTMLElement, target: HTMLElement, { cancel = false } = {}) {
    card.scrollIntoView({ block: "center" }); await frame()
    const from = center(card)
    fire(card, "pointerdown", from)
    fire(card, "pointermove", { clientX: from.clientX + 10, clientY: from.clientY + 10 }); await frame(); await frame()
    const lifted = card.hasAttribute("data-ww-dragging")
    const to = center(target.querySelector(".card-placeholder") ?? target)
    fire(card, "pointermove", to); await frame(); await frame()
    const over = target.hasAttribute("data-ww-drop-over")
    if (cancel) window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    else fire(card, "pointerup", to)
    await wait(450); await quiz.updateComplete
    return { lifted, over }
  }

  before(async function () {
    timeline = await mountTimeline()
    root = timeline.shadowRoot
  })
  after(unmountTimeline)

  it("shows the tab group when both panels are enabled", function () {
    assert.isNotNull(root.querySelector("sl-tab-group"))
  })

  it("shows the first panel without a click", function () {
    assert.isTrue((root.querySelector('sl-tab-panel[name="timeline"]') as any).active)
  })

  describe("drag and drop", function () {
    before(async function () {
      (root.querySelector("sl-tab-group") as any).show("quiz"); await wait(300)
      quiz = root.querySelector("quiz-container")
      q = quiz.shadowRoot
      total = trayCards().length
    })

    it("gives every event a card and a slot", function () {
      assert.isTrue(total > 0 && total === slots().length, `${total} cards, ${slots().length} slots`)
    })

    it("hides authoring controls from readers", function () {
      assert.isTrue(addEvent()?.hidden === true && getComputedStyle(addEvent()!).display === "none")
    })

    it("switches off touch scrolling on the cards only", function () {
      assert.isTrue(getComputedStyle(trayCards()[0]).touchAction === "none" && getComputedStyle(tray()).touchAction === "auto")
    })

    let first: string, lifted: boolean, over: boolean
    it("surrounds the commit with one transaction", async function () {
      first = trayCards()[0].dataset.wwKey!
      for (const type of ["ww-transactionstart", "ww-dragcommit", "ww-transactionend"]) timeline.addEventListener(type, () => seen.push(`${type} ${Object.keys(quiz.placements).length}`), true)
      const r = await drag(trayCards()[0], slots()[0])
      lifted = r.lifted; over = r.over
      assert.equal(seen.join(), "ww-transactionstart 0,ww-dragcommit 0,ww-transactionend 1")
    })

    it("lifts the card and marks the slot during a pointer drag", function () {
      assert.isTrue(lifted && over)
    })

    it("places the card on a pointer drop", function () {
      assert.isTrue(cardIn(slots()[0]) === first && trayCards().length === total - 1)
    })

    it("leaves nothing on the elements after the drop", function () {
      assert.isNull(q.querySelector("[data-ww-dragging], [data-ww-drop-over], [data-ww-drop-candidate]"))
      assert.isFalse([...q.querySelectorAll<HTMLElement>("[data-ww-drag]")].some(c => c.style.translate || c.style.pointerEvents))
    })

    it("swaps when a card is dropped on an occupied slot", async function () {
      const second = trayCards()[0].dataset.wwKey
      await drag(trayCards()[0], slots()[0])
      assert.isTrue(cardIn(slots()[0]) === second && trayCards().some(c => c.dataset.wwKey === first) && trayCards().length === total - 1)
    })

    it("changes nothing when Escape ends a drag", async function () {
      const before = quiz.placements
      seen.length = 0
      const r = await drag(trayCards()[0], slots()[1], { cancel: true })
      assert.isTrue(r.lifted && quiz.placements === before && !cardIn(slots()[1]))
    })

    it("sends no commit and no transaction for a cancelled drag", function () {
      assert.equal(seen.length, 0, seen.join())
    })

    it("unplaces a card dragged back to the tray", async function () {
      await drag(slots()[0].querySelector<HTMLElement>("[data-ww-drag]")!, tray() as HTMLElement)
      assert.isTrue(!cardIn(slots()[0]) && trayCards().length === total)
    })
  })

  describe("keyboard", function () {
    let card: HTMLElement, kbKey: string, live: Element | null

    it("makes cards focusable", function () {
      card = trayCards()[0]; kbKey = card.dataset.wwKey!
      assert.equal(card.tabIndex, 0)
    })

    it("marks the first slot and announces it on pick-up", function () {
      card.focus(); key(card, " "); key(card, "ArrowDown")
      live = q.querySelector("[aria-live]")
      assert.isTrue(slots()[0].hasAttribute("data-ww-drop-over") && !!live?.textContent, live?.textContent ?? "")
    })

    it("places the card on a keyboard drop", async function () {
      key(card, "Enter"); await wait(450); await quiz.updateComplete
      assert.equal(cardIn(slots()[0]), kbKey, live?.textContent ?? "")
    })

    it("cancels on Escape", function () {
      card = trayCards()[0]; card.focus(); key(card, " "); key(card, "Escape")
      assert.isTrue(!q.querySelector("[data-ww-dragging]") && trayCards().length === total - 1)
    })
  })

  describe("actions", function () {
    const button = (name: "check" | "reset") => q.querySelector<HTMLElement>({ check: "sl-button[variant=primary]", reset: ".results-container sl-button, sl-button[variant=danger]" }[name])!

    it("shows results and locks the cards on check", async function () {
      button("check").click(); await quiz.updateComplete; await frame()
      assert.isTrue(quiz.checked && !!q.querySelector(".results-container") && q.querySelectorAll("[data-ww-drag]").length === 0)
    })

    it("refuses a pick-up in a checked quiz", function () {
      const locked = slots()[0].querySelector<HTMLElement>(".card-event")!; locked.focus(); key(locked, " ")
      assert.isNull(q.querySelector("[data-ww-dragging]"))
    })

    it("returns every card to the tray on reset", async function () {
      button("reset").click(); await quiz.updateComplete; await frame()
      assert.isTrue(!quiz.checked && trayCards().length === total)
    })
  })
})

mocha.run()
