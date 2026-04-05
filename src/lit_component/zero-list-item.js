import { LitElement, html, css } from 'lit';

class ZeroListItem extends LitElement {
    static properties = {
        title: { type: String },
        subtitle: { type: String },
        active: { type: Boolean, reflect: true },
        variant: { type: String, reflect: true },
        indent: { type: Number },
        meta: { type: Array }
    };

    static styles = css`
        :host { display: block; }
        .item {
            display: flex;
            align-items: start;
            gap: 10px;
            width: 100%;
            padding: 8px 10px;
            border-radius: 12px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
            color: #edf4ff;
            cursor: pointer;
            text-align: left;
        }
        :host([variant="tree"]) .item {
            background: rgba(255,255,255,0.03);
            border-color: rgba(255,255,255,0.04);
        }
        :host([active]) .item {
            border-color: rgba(79,209,197,0.7);
            background: rgba(79,209,197,0.08);
        }
        .body {
            min-width: 0;
            flex: 1;
            display: grid;
            gap: 4px;
        }
        .title {
            font-weight: 700;
            line-height: 1.3;
        }
        .subtitle {
            color: #9db0c7;
            font-size: 0.82rem;
            line-height: 1.4;
        }
        .meta {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        .tag {
            display: inline-flex;
            align-items: center;
            padding: 2px 7px;
            border-radius: 999px;
            font-size: 0.66rem;
            background: rgba(255,255,255,0.06);
            color: #cfe0f6;
        }
    `;

    constructor() {
        super();
        this.title = '';
        this.subtitle = '';
        this.active = false;
        this.variant = 'card';
        this.indent = 0;
        this.meta = [];
    }

    render() {
        const paddingLeft = 10 + Number(this.indent || 0);
        return html`
            <div class="item" style=${`padding-left:${paddingLeft}px;`}>
                <div class="body">
                    ${this.title ? html`<div class="title">${this.title}</div>` : ''}
                    ${this.subtitle ? html`<div class="subtitle">${this.subtitle}</div>` : ''}
                    ${this.meta?.length ? html`
                        <div class="meta">
                            ${this.meta.map((item) => html`<span class="tag">${item}</span>`)}
                        </div>
                    ` : ''}
                    <slot></slot>
                </div>
            </div>
        `;
    }
}

customElements.define('zero-list-item', ZeroListItem);
