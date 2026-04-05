import { LitElement, html, css } from 'lit';

class ZeroTextarea extends LitElement {
    static properties = {
        label: { type: String },
        name: { type: String },
        value: { type: String },
        placeholder: { type: String },
        rows: { type: Number },
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
        .required { color: #f56565; margin-left: 4px; }
        textarea {
            width: 100%;
            min-height: 80px;
            background: rgba(6, 16, 26, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            color: #edf4ff;
            padding: 10px 12px;
            font-size: 0.9rem;
            font-family: "SFMono-Regular", Menlo, monospace;
            line-height: 1.6;
            transition: all 0.2s ease;
            outline: none;
            resize: vertical;
        }
        textarea:focus {
            border-color: rgba(79, 209, 197, 0.4);
            background: rgba(6, 16, 26, 0.8);
            box-shadow: 0 0 0 3px rgba(79, 209, 197, 0.1);
        }
        textarea::placeholder {
            color: rgba(157, 176, 199, 0.4);
        }
        .error-msg {
            font-size: 0.75rem;
            color: #f56565;
            margin-top: 2px;
        }
        .has-error textarea {
            border-color: rgba(245, 101, 101, 0.5);
        }
    `;

    constructor() {
        super();
        this.rows = 4;
        this.value = '';
    }

    _handleInput(e) {
        this.value = e.target.value;
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value: this.value, name: this.name },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        return html`
            ${this.label ? html`<label>${this.label}${this.required ? html`<span class="required">*</span>` : ''}</label>` : ''}
            <div class="${this.error ? 'has-error' : ''}">
                <textarea 
                    .name=${this.name}
                    .value=${this.value}
                    .placeholder=${this.placeholder || ''}
                    .rows=${this.rows}
                    ?disabled=${this.disabled}
                    @input=${this._handleInput}
                ></textarea>
            </div>
            ${this.error ? html`<div class="error-msg">${this.error}</div>` : ''}
        `;
    }
}

customElements.define('zero-textarea', ZeroTextarea);
