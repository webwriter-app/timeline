import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

@customElement("date-input")
export class DateInput extends LitElement {
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

    @property({ type: String, reflect: true, attribute: true })
    accessor value: string = "";

    @property({ type: Boolean, attribute: true })
    accessor disabled: boolean = false;

    @property({ type: String, attribute: true })
    accessor placeholder: string = "";

    @property({ type: String, attribute: true })
    accessor lang: string = "en-US";

    @query("span")
    private accessor measureElement!: HTMLSpanElement;

    @query("input")
    private accessor inputElement!: HTMLInputElement;

    @state()
    private accessor internalValue = "";

    /**
     * @param dateString A date in ISO format (YYYY, YYYY-MM, or YYYY-MM-DD)
     * @param locale The locale to use for formatting
     * @returns A localized long date string (e. g. "1 January 2000" or "January 2000")
     */
    private formatDateStringLong(dateString: string, locale: string): string {
        if (!dateString) return "";
        // If the year is negative, ignore the leading '-' for parsing
        const yearNegative = dateString.startsWith("-");

        let [year, month, day] = (yearNegative ? dateString.slice(1) : dateString).split("-").map(Number);
        if (yearNegative) year = -year;
        return Intl.DateTimeFormat(locale, {
            day: day ? "numeric" : undefined,
            month: month ? "long" : undefined,
            era: yearNegative ? "short" : undefined,
            year: "numeric",
        }).format(new Date(year, (month ?? 1) - 1, day ?? 1));
    }

    /**
     * @param dateString A date in ISO format (YYYY, YYYY-MM, or YYYY-MM-DD)
     * @returns A localized short date string (DD.MM.YYYY)
     */
    private formatDateStringShort(dateString: string): string {
        if (!dateString) return "";

        const yearNegative = dateString.startsWith("-");
        const splittedDate = yearNegative ? dateString.slice(1).split("-") : dateString.split("-");
        // Add 1 to negative years to account for the fact that there is no year 0
        if (yearNegative) splittedDate[0] = "-" + (Number(splittedDate[0]) + 1);

        return splittedDate.reverse().join(".");
    }

    /**
     * @param dateString A date in short format (DD.MM.YYYY, MM.YYYY, or YYYY)
     * @returns An ISO formatted date string (YYYY, YYYY-MM, or YYYY-MM-DD)
     * @throws Error if the date is invalid or in an incorrect format
     */
    private parseDateStringShort(dateString: string) {
        if (!/^((\d+.)?\d+.)?-?\d+$/.test(dateString)) throw new Error("Invalid date format");
        let [year, month, day] = dateString.split(".").reverse().map(Number);

        // Year 0 does not exist in the Gregorian calendar, but ISO shifts the years by 1
        // (i. e. 1 BC is year 0, 2 BC is year -1, etc.)
        if (year === 0) throw new Error("Year 0 does not exist");
        if (year < 0) year = year + 1;

        // Check if the date is valid
        const validationDate = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
        const isValidDate =
            !isNaN(validationDate.getTime()) &&
            validationDate.getUTCFullYear() === year &&
            (month ? validationDate.getUTCMonth() === month - 1 : true) &&
            (day ? validationDate.getUTCDate() === day : true);
        if (!isValidDate) throw new Error("Invalid date");

        // Convert date string to ISO format
        let parsedDateString = (year < 0 ? "-" : "") + String(Math.abs(year)).padStart(4, "0");
        if (month) parsedDateString += "-" + String(month).padStart(2, "0");
        if (day) parsedDateString += "-" + String(day).padStart(2, "0");

        return parsedDateString;
    }

    private inputFocused(event: InputEvent) {
        this.internalValue = this.formatDateStringShort(this.value);
        this.updateComplete.then(() => this.inputElement.select());
    }

    private inputChanged(event: InputEvent) {
        event.preventDefault();
        try {
            const parsedDate = this.parseDateStringShort(this.internalValue);
            if (this.value !== parsedDate) {
                this.value = parsedDate;
                this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            }
            this.inputElement.setCustomValidity("");
        } catch (e) {
            this.inputElement.setCustomValidity((e as Error).message);
            this.inputElement.reportValidity();
        }
    }

    private inputBlurred(event: Event) {
        event.preventDefault();
        try {
            const parsedDate = this.parseDateStringShort(this.internalValue);
            if (this.value !== parsedDate) {
                this.value = parsedDate;
                this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            } else {
                this.internalValue = this.formatDateStringLong(this.value, this.lang);
            }
            this.inputElement.setCustomValidity("");
        } catch (e) {}
    }

    private resizeInput() {
        this.inputElement.style.width = `${this.measureElement.offsetWidth + 1}px`;
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
            this.internalValue = this.formatDateStringLong(this.value, this.lang);
        }
        if (_changedProperties.has("internalValue")) {
            this.updateComplete.then(() => this.resizeInput());
        }
    }

    render() {
        return html`<span>${this.internalValue || this.placeholder}</span
            ><input
                type="text"
                placeholder=${this.placeholder}
                .value=${this.internalValue}
                ?disabled=${this.disabled}
                @focus=${this.inputFocused}
                @input=${(e: Event) => (this.internalValue = (e.target as HTMLInputElement).value)}
                @change=${this.inputChanged}
                @keydown=${(e: KeyboardEvent) => {
                    if (e.key === "Enter") this.inputBlurred(e);
                }}
                @blur=${this.inputBlurred}
            />`;
    }
}
