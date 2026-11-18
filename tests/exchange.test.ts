/// <reference types="mocha" />
import "mocha/mocha.js"
import { assert } from "chai"
import { getMochaConfig } from "@webwriter/build/test"
import { signal } from "@webwriter/lit"
import "../src/widgets/webwriter-timeline"
import "../src/widgets/webwriter-timeline-event"
import "../src/widgets/webwriter-timeline-event-title"
import "../src/widgets/webwriter-timeline-event-details"
import { eventsFromCsv, eventsToCsv, parseDate, splitLeadingDates } from "../src/model/timeline-exchange"
import { frame, wait, waitFor, mountTimeline, unmountTimeline } from "./helpers"
import eventsCsv from "./fixtures/events.csv"
import semicolonCsv from "./fixtures/events-semicolon.csv"
import badDateCsv from "./fixtures/bad-date.csv"
import noColumnsCsv from "./fixtures/no-columns.csv"

mocha.setup(getMochaConfig())

const file = (text: string, name = "events.csv") => new File([text], name, { type: "text/csv" })
const fragment = (html: string) => {
  const template = document.createElement("template")
  template.innerHTML = html
  return template.content
}
const events = (timeline: Element) => [...timeline.querySelectorAll(":scope > webwriter-timeline-event")]
const summary = (timeline: Element) =>
  events(timeline).map(event => [
    event.getAttribute("date") ? (event as any).date?.toISOString() : null,
    (event as any).endDate?.toISOString() ?? null,
    event.querySelector('h2[slot="title"]')!.textContent!.trim(),
  ])

async function create() {
  const timeline: any = document.createElement("webwriter-timeline")
  document.querySelector("#exchange-mount")!.append(timeline)
  await timeline.updateComplete
  return timeline
}

describe("<webwriter-timeline> dates and CSV in the model", function () {
  it("reads ISO, European and range dates", function () {
    assert.equal(parseDate("1815-12-10")!.toISOString(), "1815-12-10")
    assert.equal(parseDate("10.12.1815")!.toISOString(), "1815-12-10")
    assert.equal(parseDate("-0043")!.year, -43)
    assert.isNull(parseDate("1815-13-01"))
    const range = splitLeadingDates("1815-12-10 – 1852-11-27: Ada Lovelace")!
    assert.equal(range.endDate!.toISOString(), "1852-11-27")
    assert.equal(range.rest, "Ada Lovelace")
    assert.equal(splitLeadingDates("1815-1852 Ada")!.endDate!.year, 1852)
    assert.isNull(splitLeadingDates("3 apples"))
  })

  it("keeps quotes, commas and line breaks through a round trip", function () {
    const records = eventsFromCsv(eventsCsv)
    assert.lengthOf(records, 3)
    assert.equal(records[0].details, "First program, notes on the Engine.\nSecond line.")
    assert.equal(records[2].title, 'A "BCE" event')
    assert.deepEqual(eventsFromCsv(eventsToCsv(records)), records)
  })

  it("reads semicolons and header aliases", function () {
    const records = eventsFromCsv(semicolonCsv)
    assert.equal(records[0].date!.toISOString(), "1815-12-10")
    assert.equal(records[1].details, "Apollo 11")
  })

  it("rejects files without columns or with a bad date", function () {
    assert.throws(() => eventsFromCsv(noColumnsCsv))
    try { eventsFromCsv(badDateCsv) } catch (error: any) { assert.equal(error.row, 3) }
  })
})

describe("<webwriter-timeline> conversions", function () {
  this.timeout(30000)
  before(() => { document.body.insertAdjacentHTML("beforeend", '<div id="exchange-mount"></div>') })
  after(() => { document.getElementById("exchange-mount")?.remove(); unmountTimeline() })

  it("declares its formats in the editing configuration keys", function () {
    const timeline: any = customElements.get("webwriter-timeline")
    assert.hasAllKeys(timeline.convertFrom, ["ol", "ul", "dl", "details", ".csv", "text/csv"])
    assert.hasAllKeys(timeline.convertTo, ["details", "text/csv"])
  })

  it("takes over an ordered list with dates, markup and nested details", async function () {
    const timeline = await create()
    const result = timeline.fromElement(fragment(`<ol>
      <li>1943-06-05: <strong>ENIAC</strong><p>First general-purpose computer.</p></li>
      <li>1815-12-10 – 1852-11-27 Ada Lovelace</li>
      <li>No date here</li></ol>`))
    assert.notStrictEqual(result, false)
    assert.deepEqual(summary(timeline), [
      ["1815-12-10", "1852-11-27", "Ada Lovelace"],
      ["1943-06-05", null, "ENIAC"],
      [null, null, "No date here"],
    ])
    const eniac = events(timeline)[1]
    assert.equal(eniac.querySelector('h2[slot="title"] strong')!.textContent, "ENIAC")
    assert.include(eniac!.textContent, "general-purpose")
    assert.isNotNull(events(timeline)[0].querySelector("p"), "empty details keep a paragraph")
  })

  it("takes over a description list and a list of details with time elements", async function () {
    const timeline = await create()
    timeline.fromElement(fragment(`<dl><dt>1969-07-20 Moon landing</dt><dd>Apollo 11.</dd><dt>1906</dt><dd>Hopper</dd><dd>Compilers.</dd></dl>`))
    assert.deepEqual(summary(timeline), [["1906", null, "Hopper"], ["1969-07-20", null, "Moon landing"]])
    const other = await create()
    other.fromElement(fragment(`<details><summary><time datetime="1815-12-10">10 December 1815</time> – <time datetime="1852-11-27">27 November 1852</time>: Ada</summary><p>Text</p></details>`))
    assert.deepEqual(summary(other), [["1815-12-10", "1852-11-27", "Ada"]])
  })

  it("declines input without events", async function () {
    const timeline = await create()
    assert.strictEqual(timeline.fromElement(fragment("<ul></ul>")), false)
  })

  afterEach(unmountTimeline)

  it("exports details elements and takes them back in", async function () {
    const source = await mountTimeline()
    const out: DocumentFragment = source.toDetails()
    const details = [...out.children]
    assert.lengthOf(details, 4)
    assert.equal(details[0].localName, "details")
    assert.equal(details[0].querySelector("summary time")!.getAttribute("datetime"), "1815-12-10")
    assert.include(details[0].textContent, "First program.")
    const copy = await create()
    copy.fromElement(out)
    assert.deepEqual(summary(copy), summary(source))
  })

  it("exports CSV, imports it and keeps the text", async function () {
    const source = await mountTimeline()
    const csv: File = source.exportCsv()
    assert.equal(csv.type, "text/csv")
    assert.equal(csv.name, "timeline.csv")
    const copy = await create()
    const apply = await copy.importCsv(csv)
    assert.lengthOf(events(copy), 0, "nothing changes before apply")
    apply()
    assert.deepEqual(summary(copy), summary(source))
    assert.include(events(copy)[0]!.textContent, "First program.")
  })

  it("imports a fixture and replaces the events", async function () {
    const timeline = await mountTimeline()
    const apply = await timeline.importCsv(file(eventsCsv))
    assert.lengthOf(events(timeline), 4)
    apply()
    assert.deepEqual(summary(timeline).map(row => row[0]), ["-0043", "1815-12-10", "1943-06-05"])
  })

  it("rejects invalid files with a message and leaves the widget alone", async function () {
    const timeline = await create()
    timeline.fromElement(fragment("<ul><li>1900 Keep me</li></ul>"))
    for (const bad of [noColumnsCsv, badDateCsv, "date,title\n"]) {
      let message = ""
      try { await timeline.importCsv(file(bad)) } catch (error: any) { message = error.message }
      assert.notEqual(message, "")
    }
    assert.deepEqual(summary(timeline), [["1900", null, "Keep me"]])
  })
})

describe("<webwriter-timeline> signals", function () {
  this.timeout(30000)
  afterEach(unmountTimeline)

  it("publishes score and complete from the quiz", async function () {
    const timeline = await mountTimeline()
    assert.equal(timeline.signals.score.get(), 0)
    assert.isFalse(timeline.signals.complete.get())
    assert.strictEqual(timeline.signals, timeline.signals, "signal instances stay stable")
    const quiz = timeline.shadowRoot.querySelector("quiz-container")
    // Place the cards correctly through the component's own state, then submit.
    quiz.placements = Object.fromEntries(quiz.events.map((event: any) => [event.id, event.id]))
    quiz.check()
    await quiz.updateComplete
    assert.isTrue(await waitFor(() => timeline.signals.complete.get()))
    assert.equal(timeline.signals.score.get(), 1)
    quiz.reset()
    await quiz.updateComplete
    assert.isTrue(await waitFor(() => !timeline.signals.complete.get()))
    assert.equal(timeline.signals.score.get(), 0)
  })

  it("scores a wrong placement below 1", async function () {
    const timeline = await mountTimeline()
    const quiz = timeline.shadowRoot.querySelector("quiz-container")
    const ids: string[] = quiz.events.map((event: any) => event.id)
    quiz.placements = { [ids[0]]: ids[1], [ids[1]]: ids[0], [ids[2]]: ids[2], [ids[3]]: ids[3] }
    quiz.check()
    await quiz.updateComplete
    assert.isTrue(await waitFor(() => timeline.signals.complete.get()))
    assert.equal(timeline.signals.score.get(), 0.5)
  })

  it("lets a receiving widget follow the source and clear it on abort", async function () {
    const timeline = await mountTimeline()
    const received = signal<{ get(): number } | null>(null)
    const lifetime = new AbortController()
    received.set(timeline.signals.score)
    lifetime.signal.addEventListener("abort", () => received.set(null), { once: true })
    assert.equal(received.get()!.get(), 0)
    const quiz = timeline.shadowRoot.querySelector("quiz-container")
    quiz.placements = Object.fromEntries(quiz.events.map((event: any) => [event.id, event.id]))
    quiz.check()
    await quiz.updateComplete
    await waitFor(() => received.get()!.get() === 1)
    assert.equal(received.get()!.get(), 1)
    lifetime.abort()
    assert.isNull(received.get())
    await frame(); await wait(10)
  })
})

mocha.run()
