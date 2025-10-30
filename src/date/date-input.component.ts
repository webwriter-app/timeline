import { LitElementWw } from "@webwriter/lit";
import { css, html, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { TimelineDate, timelineDateConverter } from "./timeline-date";

export class DateInput extends LitElementWw {
    static styles = css`
        :host {
            display: inline-block;
            position: relative;
            overflow: hidden;
        }

        input {
            border: none;
            background: none;
            padding: 0;
            font: inherit;
            outline: none;
        }

        input:disabled {
            color: black;
        }

        input::placeholder {
            color: var(--sl-color-gray-500);
        }

        /* Use an invisible span to measure the length of the text */
        span {
            position: absolute;
            left: 0;
            opacity: 0;
            z-index: -1;

            /* Prevent wrapping and ensure spaces are counted */
            white-space: pre;
        }
    `;

    private measureElement = createRef<HTMLSpanElement>();
    private inputElement = createRef<HTMLInputElement>();

    @property({
        type: TimelineDate,
        reflect: true,
        attribute: true,
        converter: timelineDateConverter,
    })
    accessor value: TimelineDate | null = null;

    @state()
    private accessor internalValue = "";

    @property({ type: Boolean, attribute: true })
    accessor disabled: boolean = false;

    @property({ type: Boolean, attribute: true })
    accessor optional: boolean = false;

    @property({ type: String, attribute: true })
    accessor placeholder: string = "";

    @property({ type: String, attribute: true })
    accessor lang: string = "en-US";

    private inputFocused(event: InputEvent) {
        this.internalValue = this.value?.toEuropeanString() ?? "";
        this.updateComplete.then(() => this.inputElement.value?.select());
    }

    private inputChanged(event: InputEvent) {
        event.preventDefault();
        if (this.optional && this.internalValue.trim() === "") {
            this.value = null;
            this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            this.inputElement.value?.setCustomValidity("");
            return;
        }

        try {
            const parsedDate = TimelineDate.fromEuropeanString(this.internalValue);
            if (this.value !== parsedDate) {
                this.value = parsedDate;
                this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            }
            this.inputElement.value?.setCustomValidity("");
        } catch (e) {
            this.inputElement.value?.setCustomValidity((e as Error).message);
            this.inputElement.value?.reportValidity();
        }
    }

    private inputBlurred(event: Event) {
        event.preventDefault();
        if (this.optional && this.internalValue.trim() === "") {
            this.value = null;
            this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            this.inputElement.value?.setCustomValidity("");
            return;
        }

        try {
            const parsedDate = TimelineDate.fromEuropeanString(this.internalValue);
            if (this.value !== parsedDate) {
                this.value = parsedDate;
                this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            } else {
                this.internalValue = this.value?.toLocalizedString(this.lang) ?? "";
            }
            this.inputElement.value?.setCustomValidity("");
        } catch (e) {}
    }

    private resizeInput() {
        if (!this.inputElement.value || !this.measureElement.value) return;
        this.inputElement.value.style.width = `${this.measureElement.value.offsetWidth + 1}px`;
    }

    protected firstUpdated(_changedProperties: PropertyValues): void {
        this.resizeInput();
    }

    connectedCallback(): void {
        super.connectedCallback();
        setTimeout(() => this.resizeInput(), 0);
    }

    protected updated(_changedProperties: PropertyValues): void {
        if (_changedProperties.has("value") || _changedProperties.has("lang")) {
            this.internalValue = this.value?.toLocalizedString(this.lang) ?? "";
        }
        if (_changedProperties.has("internalValue")) {
            this.updateComplete.then(() => this.resizeInput());
        }
    }

    render() {
        return html`<span ${ref(this.measureElement)}>${this.internalValue || this.placeholder}</span
            ><input
                ${ref(this.inputElement)}
                type="text"
                placeholder=${this.placeholder}
                .value=${this.internalValue}
                ?disabled=${this.disabled}
                @focus=${this.inputFocused}
                @input=${(e: Event) => (this.internalValue = (e.target as HTMLInputElement).value)}
                @change=${this.inputChanged}
                @keydown=${(e: KeyboardEvent) => {
                    if (e.key === "Enter") {
                        this.inputElement.value?.blur();
                        this.inputBlurred(e);
                    }
                }}
                @blur=${this.inputBlurred}
            />`;
    }
}
