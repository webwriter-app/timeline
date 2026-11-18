const sheet = new CSSStyleSheet();
// The images and videos of the details are authored light DOM, which `::slotted` cannot reach below its first level.
sheet.replaceSync(`
webwriter-timeline-event :is(img, picture, video, canvas, svg, iframe) { max-width: 100%; }
webwriter-timeline-event :is(img, picture, video, canvas) { height: auto; }
@media print { webwriter-timeline-event :is(img, video, canvas) { max-height: 90vh; width: auto; max-width: 100%; object-fit: contain; } }
`);

const users = new Map<Document | ShadowRoot, number>();

/** Adds the media rules to the root that holds `host`; the returned function removes them with the last user. */
export function adoptDetailsMediaStyles(host: Element): () => void {
    const root = host.getRootNode() as Document | ShadowRoot;
    if (!("adoptedStyleSheets" in root)) return () => {};
    const count = users.get(root) ?? 0;
    users.set(root, count + 1);
    if (count === 0) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return () => {
        const left = (users.get(root) ?? 1) - 1;
        if (left > 0) return void users.set(root, left);
        users.delete(root);
        root.adoptedStyleSheets = root.adoptedStyleSheets.filter((other) => other !== sheet);
    };
}
