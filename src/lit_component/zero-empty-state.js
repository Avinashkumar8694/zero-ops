import { LitElement, html, css } from 'lit';

class ZeroEmptyState extends LitElement {
    static properties = {
        icon:    { type: String },
        heading: { type: String },
        message: { type: String }
    };

    static styles = css`
        :host { display: flex; align-items: center; justify-content: center; }
        .wrap {
            display: grid;
            gap: 10px;
            text-align: center;
            padding: 32px 24px;
        }
        .icon {
            font-size: 2.4rem;
            line-height: 1;
            opacity: 0.4;
        }
        .heading {
            font-size: 1rem;
            font-weight: 700;
            color: #cfe0f6;
            margin: 0;
        }
        .message {
            color: #9db0c7;
            font-size: 0.84rem;
            line-height: 1.6;
            max-width: 260px;
            margin: 0 auto;
        }
        ::slotted(*) { margin-top: 10px; }
    `;

    constructor() {
        super();
        this.icon = '◻';
        this.heading = '';
        this.message = '';
    }

    render() {
        return html`
            <div class="wrap">
                ${this.icon ? html`<div class="icon">${this.icon}</div>` : ''}
                ${this.heading ? html`<p class="heading">${this.heading}</p>` : ''}
                ${this.message ? html`<p class="message">${this.message}</p>` : ''}
                <slot></slot>
            </div>
        `;
    }
}

customElements.define('zero-empty-state', ZeroEmptyState);
