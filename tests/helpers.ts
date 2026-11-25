export const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function waitFor(condition: () => unknown, ms = 10000) {
  const end = performance.now() + ms
  while (performance.now() < end) {
    if (await condition()) return true
    await wait(50)
  }
  return false
}

export const TIMELINE_HTML = `<webwriter-timeline>
  <webwriter-timeline-event id="e1" date="1815-12-10"><h2 slot="title">Ada Lovelace</h2><p>First program.</p></webwriter-timeline-event>
  <webwriter-timeline-event id="e2" date="1906-12-09"><h2 slot="title">Grace Hopper</h2><p>Compilers.</p></webwriter-timeline-event>
  <webwriter-timeline-event id="e3" date="1936-08-26"><h2 slot="title">Margaret Hamilton</h2><p>Apollo software.</p></webwriter-timeline-event>
  <webwriter-timeline-event id="e4" date="1969-07-20"><h2 slot="title">Moon landing</h2><p>Apollo 11.</p></webwriter-timeline-event>
</webwriter-timeline>`

export async function mountTimeline(): Promise<any> {
  document.body.insertAdjacentHTML("beforeend", `<div id="timeline-mount">${TIMELINE_HTML}</div>`)
  const timeline: any = document.querySelector("#timeline-mount webwriter-timeline")
  await wait(300)
  await timeline.updateComplete
  return timeline
}

export function unmountTimeline() {
  document.getElementById("timeline-mount")?.remove()
  document.designMode = "off"
}
