# Timeline (`@webwriter/timeline@2.0.0-dev.1`)
[License: MIT](LICENSE) | Version: 2.0.0-dev.1

Create/learn with a digital timeline and test your knowledge.

## Snippets
[Snippets](https://webwriter.app/docs/snippets/snippets/) are examples and templates using the package's widgets.

| Name | Import Path |
| :--: | :---------: |
| Webwriter Timeline | `@webwriter/timeline/snippets/webwriter-timeline.html` |
| Women In Tech | `@webwriter/timeline/snippets/women-in-tech.html` |
| History Of Olympic Games | `@webwriter/timeline/snippets/history-of-olympic-games.html` |



## `WebWriterTimelineWidget` (`<webwriter-timeline>`)
Displays a timeline with events and a quiz based on those events.

As children, it should only contain `<webwriter-timeline-event>` elements in order
to function properly. Any other children may lead to unexpected behavior.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/timeline/widgets/webwriter-timeline.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/timeline/widgets/webwriter-timeline.js"></script>
<webwriter-timeline></webwriter-timeline>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/timeline
```

```html
<link href="@webwriter/timeline/widgets/webwriter-timeline.css" rel="stylesheet">
<script type="module" src="@webwriter/timeline/widgets/webwriter-timeline.js"></script>
<webwriter-timeline></webwriter-timeline>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `enabledPanels` (`panels`) | `"timeline" \| "quiz" \| "timeline+quiz"` | Which panels are enabled for the reader:<br>- "timeline": only the timeline panel<br>- "quiz": only the quiz panel<br>- "timeline+quiz": both panels with tabs | `"timeline+quiz"` | ✓ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, events, custom CSS properties, or CSS parts.*


## `WebWriterTimelineEventWidget` (`<webwriter-timeline-event>`)
A single event in a `webwriter-timeline` component. Should not be used independently.
As children, it must contain both a `webwriter-timeline-event-title` and a `webwriter-timeline-event-details` element,
which contain the title and details of the event, respectively.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/timeline/widgets/webwriter-timeline-event.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/timeline/widgets/webwriter-timeline-event.js"></script>
<webwriter-timeline-event></webwriter-timeline-event>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/timeline
```

```html
<link href="@webwriter/timeline/widgets/webwriter-timeline-event.css" rel="stylesheet">
<script type="module" src="@webwriter/timeline/widgets/webwriter-timeline-event.js"></script>
<webwriter-timeline-event></webwriter-timeline-event>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `date` (`date`) | `TimelineDate \| null` | The (start) date of the event.<br>Must be formatted as an ISO 8601 date as "YYYY", "YYYY-MM", or "YYYY-MM-DD".<br>Any year BCE must be represented with a negative year number, with year 0 representing 1 BCE, -1 representing 2 BCE, and so on. | `null` | ✓ |
| `endDate` (`endDate`) | `TimelineDate \| null` | The end date of the event, should be after the start date.<br>Must be formatted as an ISO 8601 date as "YYYY", "YYYY-MM", or "YYYY-MM-DD".<br>Any year BCE must be represented with a negative year number, with year 0 representing 1 BCE, -1 representing 2 BCE, and so on. | `null` | ✓ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Events
| Name | Description |
| :--: | :---------: |
| date-changed | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, custom CSS properties, or CSS parts.*


## `WebWriterTimelineEventTitleWidget` (`<webwriter-timeline-event-title>`)
The title of a `webwriter-timeline-event` element. Should not be used independently.
As children, it can contain any inline "text" content (e.g., text nodes, `<strong>`, `<em>`, etc.).

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/timeline/widgets/webwriter-timeline-event-title.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/timeline/widgets/webwriter-timeline-event-title.js"></script>
<webwriter-timeline-event-title></webwriter-timeline-event-title>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/timeline
```

```html
<link href="@webwriter/timeline/widgets/webwriter-timeline-event-title.css" rel="stylesheet">
<script type="module" src="@webwriter/timeline/widgets/webwriter-timeline-event-title.js"></script>
<webwriter-timeline-event-title></webwriter-timeline-event-title>
```

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public fields, methods, slots, events, custom CSS properties, or CSS parts.*


## `WebWriterTimelineEventDetailsWidget` (`<webwriter-timeline-event-details>`)
The details of a `webwriter-timeline-event` component. Should not be used independently.
As children, it can contain any HTML content representing the details of the event.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/timeline/widgets/webwriter-timeline-event-details.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/timeline/widgets/webwriter-timeline-event-details.js"></script>
<webwriter-timeline-event-details></webwriter-timeline-event-details>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/timeline
```

```html
<link href="@webwriter/timeline/widgets/webwriter-timeline-event-details.css" rel="stylesheet">
<script type="module" src="@webwriter/timeline/widgets/webwriter-timeline-event-details.js"></script>
<webwriter-timeline-event-details></webwriter-timeline-event-details>
```

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public fields, methods, slots, events, custom CSS properties, or CSS parts.*


---
*Generated with @webwriter/build@1.9.0*