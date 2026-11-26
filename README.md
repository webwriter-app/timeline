# Timeline (`@webwriter/timeline@3.1.2`)
[License: MIT](LICENSE) | Version: 3.1.2

Create and explore timelines, then test what you know.

## Snippets
[Snippets](https://webwriter.app/docs/snippets/snippets/) are examples and templates using the package's widgets.

| Name | Import Path |
| :--: | :---------: |
| Webwriter Timeline | `@webwriter/timeline/snippets/webwriter-timeline.html` |
| Women In Tech | `@webwriter/timeline/snippets/women-in-tech.html` |
| History Of Olympic Games | `@webwriter/timeline/snippets/history-of-olympic-games.html` |



## `WebwriterTimeline` (`<webwriter-timeline>`)
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
| `WebwriterTimeline.options` | `object` | - | `{ panels: { type: "select" as const, label: (widget: { msg: MsgFn }) => widget.msg("Visible panels"), options: [ { value: "timeline+quiz", label: (widget: { msg: MsgFn }) => widget.msg("Timeline and Quiz") }, { value: "timeline", label: (widget: { msg: MsgFn }) => widget.msg("Timeline only") }, { value: "quiz", label: (widget: { msg: MsgFn }) => widget.msg("Quiz only") }, ], }, }` | ✗ |
| `WebwriterTimeline.convertFrom` | `object` | DOM and file conversions. See the class description for the formats. | `{ ol: "fromElement", ul: "fromElement", dl: "fromElement", details: "fromElement", ".csv": "importCsv", "text/csv": "importCsv", }` | ✗ |
| `WebwriterTimeline.convertTo` | `object` | - | `{ details: "toDetails", "text/csv": "exportCsv", }` | ✗ |
| `localize` | - | - | - | ✗ |
| `enabledPanels` (`panels`) | `"timeline" \| "quiz" \| "timeline+quiz"` | Which panels are enabled for the reader:<br>- "timeline": only the timeline panel<br>- "quiz": only the quiz panel<br>- "timeline+quiz": both panels with tabs | `"timeline+quiz"` | ✓ |
| `signals` | `object` | The quiz result for other widgets: `score` from 0 to 1 and `complete` once the answers are submitted. | `{ score: computed(() => this.#score.get()), complete: computed(() => this.#complete.get()), }` | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `focus` | - | `options: FocusOptions`
| `fromElement` | Takes over the events of a copied list, description list or `details` elements. | `fragment: DocumentFragment`
| `toDetails` | The events as `details` elements, or `null` when there are none. | -
| `importCsv` | Reads the whole file first. The returned function replaces all events. | `file: File`
| `exportCsv` | - | -

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| line | The vertical line of the timeline (also in the quiz panel). |
| marker | The dot of an event in the quiz panel. The dots in the timeline panel belong to `webwriter-timeline-event`. |
| card | A draggable event card in the quiz panel. Media rules for authored images and videos in the details are adopted as one page-level stylesheet into the root that holds the element (counted per root, removed on disconnect); roots without `adoptedStyleSheets` skip it. Conversions: an `ol`, `ul`, `dl` or a series of `details` elements becomes a timeline, and the timeline can become `details` elements. A list item, a `dt` or a `summary` starts with the date or date range (ISO 8601 such as `1815-12-10`, or `10.12.1815`; a `time` element with `datetime` also works), then the title; what follows the title is the detail text. Dates with a year below 1000 need the ISO form with four digits, such as `0476`. The timeline reads and writes CSV (`.csv`, `text/csv`) with the columns `date`, `end_date`, `title` and `details` (UTF-8, comma or semicolon separated on import). A file import replaces all events. CSV keeps plain text only: the formatting, links and images in the details are dropped, and each paragraph of the details becomes one line. Signals: `score` is the share of events the reader placed correctly in the quiz after submitting (a number from 0 to 1, 0 until then), and `complete` is `true` once the answers are submitted. A receiving widget connects with an effect attribute such as `value-from="#timeline-id[score]"`. The timeline has no effects of its own. Theme: text uses `--ww-text-color` and `--ww-font-family`; the line, dots and highlights use `--ww-theme-accent-1` and `--ww-theme-accent-2`. Print: shows the active panel without tabs and controls. The quiz prints as a worksheet (event cards and empty date boxes). |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, events, or custom CSS properties.*


## `WebwriterTimelineEvent` (`<webwriter-timeline-event>`)
A single event in a `webwriter-timeline` component. Should not be used independently.
Contains exactly one `h2[slot="title"]` and flow content in the default slot.

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
| `localize` | - | - | - | ✗ |
| `selectionStates` | - | Native selection states maintained by WebWriter, separate from authored HTML. | - | ✗ |
| `date` (`date`) | `TimelineDate \| null` | The (start) date of the event.<br>Must be formatted as an ISO 8601 date as "YYYY", "YYYY-MM", or "YYYY-MM-DD".<br>Any year BCE must be represented with a negative year number, with year 0 representing 1 BCE, -1 representing 2 BCE, and so on. | `null` | ✓ |
| `endDate` (`endDate`) | `TimelineDate \| null` | The end date of the event, should be after the start date.<br>Must be formatted as an ISO 8601 date as "YYYY", "YYYY-MM", or "YYYY-MM-DD".<br>Any year BCE must be represented with a negative year number, with year 0 representing 1 BCE, -1 representing 2 BCE, and so on. | `null` | ✓ |
| `isIncomplete` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `focus` | - | `options: FocusOptions`

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Slots
| Name | Description | Content Type |
| :--: | :---------: | :----------: |
| `title` | Exactly one h2 containing the event title. | - |
| *(default)* | Authored flow content describing the event. | - |

*[Slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots) define how the content of the widget is rendered.*

## Events
| Name | Description |
| :--: | :---------: |
| date-changed | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| marker | The dot on the timeline line. |
| edge | The selectable left edge in edit mode. |
| reorder-hint | Guidance to change the date to reorder the event. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public custom CSS properties.*


## `WebwriterTimelineEventTitle` (`<webwriter-timeline-event-title>`)
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

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, events, custom CSS properties, or CSS parts.*


## `WebwriterTimelineEventDetails` (`<webwriter-timeline-event-details>`)
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

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, events, custom CSS properties, or CSS parts.*


---
*Generated with @webwriter/build@1.15.0*
