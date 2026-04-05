import { LitElement, html, css } from 'lit';

class ZeroButton extends LitElement {
    static properties = {
        href: { type: String },
        tone: { type: String, reflect: true },
        disabled: { type: Boolean, reflect: true },
        type: { type: String },
        compact: { type: Boolean, reflect: true }
    };

    static styles = css`
        :host { display: inline-flex; }
        a,
        button {
            border: 0;
            border-radius: 999px;
            padding: 8px 13px;
            cursor: pointer;
            color: #08111a;
            background: #4fd1c5;
            font-weight: 700;
            text-decoration: none;
            font-size: 0.86rem;
            line-height: 1.2;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 34px;
        }
        :host([compact]) a,
        :host([compact]) button {
            min-height: 30px;
            padding: 6px 11px;
            font-size: 0.8rem;
        }
        :host([tone="alt"]) a,
        :host([tone="alt"]) button {
            color: #edf4ff;
            background: rgba(255,255,255,0.08);
        }
        :host([tone="warn"]) a,
        :host([tone="warn"]) button {
            background: #fc8181;
            color: #08111a;
        }
        :host([disabled]) a,
        :host([disabled]) button {
            opacity: 0.55;
            pointer-events: none;
        }
    `;

    constructor() {
        super();
        this.href = '';
        this.tone = 'accent';
        this.disabled = false;
        this.type = 'button';
        this.compact = false;
    }

    render() {
        if (this.href) {
            return html`<a href=${this.href}><slot></slot></a>`;
        }
        return html`<button ?disabled=${this.disabled} type=${this.type}><slot></slot></button>`;
    }
}

customElements.define('zero-button', ZeroButton);
