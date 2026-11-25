/** Flatten legacy event wrappers while preserving their authored content and attributes. */
export function migrateEvent(event) {
    if (event.localName !== "webwriter-timeline-event") return;
    for (const child of [...event.children]) {
        if (child.localName === "webwriter-timeline-event-title") {
            const title = event.ownerDocument.createElement(event.querySelector(':scope > h2[slot="title"]') ? "div" : "h2");
            for (const attribute of child.attributes) title.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
            if (title.localName === "h2") title.slot = "title";
            title.append(...child.childNodes);
            child.replaceWith(title);
        } else if (child.localName === "webwriter-timeline-event-details") {
            if (child.attributes.length) {
                const contents = event.ownerDocument.createElement("div");
                for (const attribute of child.attributes) contents.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
                contents.append(...child.childNodes);
                child.replaceWith(contents);
            } else {
                child.replaceWith(...child.childNodes);
            }
        }
    }
}

document.addEventListener("migrate", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    migrateEvent(target);
    for (const child of target.querySelectorAll("webwriter-timeline-event")) migrateEvent(child);
});
