import { LitElement, html, css } from 'lit';

class ZeroStatCard extends LitElement {
    static properties = {
        value: { type: String },
        label: { type: String }
    };

    static styles = css`
        :host { display: block; }
        .stat {
            padding: 11px 13px;
            border-radius: 14px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
        }
        strong {
            display: block;
            font-size: 1.08rem;
            color: #edf4ff;
        }
        span {
            color: #9db0c7;
            font-size: 0.8rem;
        }
    `;

    constructor() {
        super();
        this.value = '';
        this.label = '';
    }

    render() {
        return html`
            <div class="stat">
                <strong>${this.value}</strong>
                <span>${this.label}</span>
            </div>
        `;
    }
}

customElements.define('zero-stat-card', ZeroStatCard);
