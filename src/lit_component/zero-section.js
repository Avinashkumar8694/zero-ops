import { LitElement, html, css } from 'lit';

class ZeroSection extends LitElement {
    static properties = {
        heading:   { type: String },
        open:      { type: Boolean, reflect: true },
        compact:   { type: Boolean, reflect: true }
    };

    static styles = css`
        :host { display: block; }
        .panel {
            background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            overflow: hidden;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            cursor: pointer;
            user-select: none;
            transition: background 0.12s;
        }
        .header:hover { background: rgba(255,255,255,0.03); }
        .heading {
            font-size: 0.76rem;
            font-weight: 800;
            letter-spacing: 0.07em;
            text-transform: uppercase;
            color: #9db0c7;
            margin: 0;
        }
        .chevron {
            font-size: 0.72rem;
            color: #9db0c7;
            transition: transform 0.2s;
        }
        :host([open]) .chevron { transform: rotate(180deg); }
        .body {
            padding: 0 14px 14px;
            display: none;
        }
        :host([open]) .body { display: block; }
        .slot-actions { display: flex; gap: 6px; align-items: center; }
    `;

    constructor() {
        super();
        this.heading = '';
        this.open = true;
        this.compact = false;
    }

    _toggle() {
        this.open = !this.open;
        this.dispatchEvent(new CustomEvent('toggle', { detail: { open: this.open }, bubbles: true, composed: true }));
    }

    render() {
        return html`
            <div class="panel">
                <div class="header" @click=${this._toggle}>
                    <p class="heading">${this.heading}</p>
                    <div class="slot-actions">
                        <slot name="actions" @click=${(e) => e.stopPropagation()}></slot>
                        <span class="chevron">▼</span>
                    </div>
                </div>
                <div class="body">
                    <slot></slot>
                </div>
            </div>
        `;
    }
}

customElements.define('zero-section', ZeroSection);
