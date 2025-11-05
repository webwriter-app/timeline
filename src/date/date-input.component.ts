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

    private onInputFocus(event: InputEvent) {
        this.internalValue = this.value?.toEuropeanString() ?? "";
        this.updateComplete.then(() => this.inputElement.value?.select());
    }

    private blurCausedByKeydown = false;

    private onInputKeydown(event: KeyboardEvent) {
        if (event.key !== "Enter") return;
        event.preventDefault();

        if (this.optional && this.internalValue.trim() === "") {
            this.value = null;
            return;
        }

        try {
            this.value = TimelineDate.fromEuropeanString(this.internalValue);
            this.inputElement.value?.setCustomValidity("");
            this.blurCausedByKeydown = true;
            this.inputElement.value?.blur();
        } catch (e) {
            this.inputElement.value?.setCustomValidity((e as Error).message);
            this.inputElement.value?.reportValidity();
        }
    }

    private onInputBlur(event: Event) {
        // If the blur was caused by pressing Enter, we have already handled it
        if (this.blurCausedByKeydown) {
            this.blurCausedByKeydown = false;
            return;
        }

        event.preventDefault();

        if (this.optional && this.internalValue.trim() === "") {
            this.value = null;
            return;
        }

        try {
            this.value = TimelineDate.fromEuropeanString(this.internalValue);
        } catch (e) {
            // Even if the date is invalid, revert to the last valid date on blur
            this.internalValue = this.value?.toLocalizedString(this.lang) ?? "";
        }
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

            // Send update event if the value actually changed
            const oldValue = _changedProperties.get("value") as TimelineDate | null;
            const valueNotChanged =
                (oldValue === null && this.value === null) ||
                (oldValue && this.value && oldValue.compare(this.value) === 0);
            if (!valueNotChanged) {
                this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            }
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
                @focus=${this.onInputFocus}
                @input=${(e: Event) => {
                    this.internalValue = (e.target as HTMLInputElement).value;
                    // Required, otherwise the validation popup would re-appear on every keystroke
                    this.inputElement.value?.setCustomValidity("");
                }}
                @keydown=${this.onInputKeydown}
                @blur=${this.onInputBlur}
            />`;
    }
}
