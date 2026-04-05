import { LitElement, html, css } from 'lit';

class ZeroBadge extends LitElement {
    static properties = {
        tone: { type: String, reflect: true }
    };

    static styles = css`
        :host { display: inline-flex; }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 9px;
            border-radius: 999px;
            font-size: 0.7rem;
            letter-spacing: 0.04em;
            background: rgba(79,209,197,0.14);
            color: #7be7dd;
            border: 1px solid rgba(79,209,197,0.18);
        }
        :host([tone="warm"]) .badge {
            background: rgba(246,173,85,0.16);
            color: #ffd591;
            border-color: rgba(246,173,85,0.22);
        }
        :host([tone="neutral"]) .badge {
            background: rgba(255,255,255,0.06);
            color: #d7e4f7;
            border-color: rgba(255,255,255,0.08);
        }
    `;

    constructor() {
        super();
        this.tone = 'accent';
    }

    render() {
        return html`<span class="badge"><slot></slot></span>`;
    }
}

customElements.define('zero-badge', ZeroBadge);
