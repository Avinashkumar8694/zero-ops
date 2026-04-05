import { LitElement, html, css } from 'lit';

class ZeroContextMenu extends LitElement {
    static properties = {
        open: { type: Boolean, reflect: true },
        x: { type: Number },
        y: { type: Number },
        items: { type: Array }
    };

    static styles = css`
        :host { position: fixed; inset: 0; pointer-events: none; z-index: 1000; }
        .menu {
            position: fixed;
            min-width: 200px;
            border-radius: 14px;
            background: #0f1720;
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 24px 60px rgba(0,0,0,0.35);
            padding: 6px;
            pointer-events: auto;
        }
        .item {
            padding: 9px 10px;
            border-radius: 10px;
            color: #edf4ff;
            cursor: pointer;
            display: grid;
            gap: 2px;
        }
        .item:hover { background: rgba(79,209,197,0.1); }
        .item.danger { color: #ff7b7b; }
        .item.danger:hover { background: rgba(255,80,80,0.1); }
        .label { font-weight: 700; font-size: 0.84rem; }
        .desc { color: #9db0c7; font-size: 0.76rem; line-height: 1.35; }
        .separator { height: 1px; background: rgba(255,255,255,0.07); margin: 4px 6px; }
    `;

    constructor() {
        super();
        this.open = false;
        this.x = 0;
        this.y = 0;
        this.items = [];
        this._outsideHandler = this._handleOutside.bind(this);
        this._keyHandler = this._handleKey.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('mousedown', this._outsideHandler, true);
        document.addEventListener('keydown', this._keyHandler, true);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('mousedown', this._outsideHandler, true);
        document.removeEventListener('keydown', this._keyHandler, true);
    }

    _handleOutside(event) {
        if (!this.open) return;
        const menu = this.shadowRoot?.querySelector('.menu');
        if (menu && event.composedPath().includes(menu)) return;
        this.close();
    }

    _handleKey(event) {
        if (this.open && event.key === 'Escape') this.close();
    }

    close() {
        this.open = false;
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    }

    _getPosition() {
        const menuW = 220;
        const menuH = Math.min((this.items || []).filter(i => !i.separator).length * 46 + 12, 400);
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const x = this.x + menuW > vw ? Math.max(0, vw - menuW - 8) : this.x;
        const y = this.y + menuH > vh ? Math.max(0, this.y - menuH) : this.y;
        return { x, y };
    }

    render() {
        if (!this.open) return html``;
        const { x, y } = this._getPosition();
        return html`
            <div class="menu" style=${`left:${x}px; top:${y}px;`}>
                ${(this.items || []).map((item) => item.separator
                    ? html`<div class="separator"></div>`
                    : html`
                        <div
                            class=${'item' + (item.danger ? ' danger' : '')}
                            @click=${() => {
                                this.close();
                                this.dispatchEvent(new CustomEvent('select', { detail: item, bubbles: true, composed: true }));
                            }}>
                            <div class="label">${item.label}</div>
                            ${item.description ? html`<div class="desc">${item.description}</div>` : ''}
                        </div>
                    `
                )}
            </div>
        `;
    }
}

customElements.define('zero-context-menu', ZeroContextMenu);
