import { LitElement, html, css } from 'lit';

class ZeroSelect extends LitElement {
    static properties = {
        label: { type: String },
        name: { type: String },
        value: { type: String },
        options: { type: Array }, // [{ value: 'GET', label: 'GET' }]
        error: { type: String },
        disabled: { type: Boolean },
        required: { type: Boolean }
    };

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: 100%;
        }
        label {
            font-size: 0.82rem;
            font-weight: 600;
            color: #9db0c7;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        select {
            width: 100%;
            background: rgba(6, 16, 26, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            color: #edf4ff;
            padding: 10px 12px;
            font-size: 0.9rem;
            font-family: inherit;
            appearance: none;
            cursor: pointer;
            outline: none;
            transition: all 0.2s ease;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(157, 176, 199, 0.6)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 16px;
        }
        select:focus {
            border-color: rgba(79, 209, 197, 0.4);
            background-color: rgba(6, 16, 26, 0.8);
            box-shadow: 0 0 0 3px rgba(79, 209, 197, 0.1);
        }
        select:hover:not(:focus) {
            border-color: rgba(255, 255, 255, 0.2);
        }
        option {
            background-color: #06101a;
            color: #edf4ff;
        }
    `;

    constructor() {
        super();
        this.options = [];
        this.value = '';
    }

    _handleChange(e) {
        this.value = e.target.value;
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value: this.value, name: this.name },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        return html`
            ${this.label ? html`<label>${this.label}${this.required ? html`<span style="color:#f56565">*</span>` : ''}</label>` : ''}
            <select .name=${this.name} .value=${this.value} ?disabled=${this.disabled} @change=${this._handleChange}>
                ${this.options.map(opt => html`
                    <option value=${opt.value} ?selected=${opt.value === this.value}>${opt.label || opt.value}</option>
                `)}
            </select>
        `;
    }
}

customElements.define('zero-select', ZeroSelect);
