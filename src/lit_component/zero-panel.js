import { LitElement, html, css } from 'lit';

class ZeroPanel extends LitElement {
    static properties = {
        heading: { type: String },
        description: { type: String },
        compact: { type: Boolean, reflect: true }
    };

    static styles = css`
        :host { display: block; }
        .panel {
            min-width: 0;
            background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            box-shadow: 0 20px 48px rgba(0,0,0,0.25);
            padding: 14px;
            color: #edf4ff;
        }
        :host([compact]) .panel {
            padding: 10px;
        }
        .head {
            display: grid;
            gap: 4px;
            margin-bottom: 10px;
        }
        .topline {
            display: flex;
            align-items: start;
            justify-content: space-between;
            gap: 12px;
        }
        h3 {
            margin: 0;
            font-size: 0.88rem;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }
        p {
            margin: 0;
            color: #9db0c7;
            line-height: 1.5;
            font-size: 0.84rem;
        }
        .actions {
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
    `;

    constructor() {
        super();
        this.heading = '';
        this.description = '';
        this.compact = false;
    }

    render() {
        return html`
            <section class="panel">
                ${(this.heading || this.description || this.querySelector('[slot="actions"]')) ? html`
                    <div class="head">
                        <div class="topline">
                            ${this.heading ? html`<h3>${this.heading}</h3>` : html`<span></span>`}
                            <div class="actions"><slot name="actions"></slot></div>
                        </div>
                        ${this.description ? html`<p>${this.description}</p>` : ''}
                    </div>
                ` : ''}
                <slot></slot>
            </section>
        `;
    }
}

customElements.define('zero-panel', ZeroPanel);
