import { LitElement, html, css } from 'lit';

const METHOD_COLORS = {
    GET:    { bg: 'rgba(79,209,197,0.15)',  color: '#4fd1c5' },
    POST:   { bg: 'rgba(246,173,85,0.15)',  color: '#f6ad55' },
    PUT:    { bg: 'rgba(125,211,252,0.15)', color: '#7dd3fc' },
    PATCH:  { bg: 'rgba(167,139,250,0.15)',color: '#a78bfa' },
    DELETE: { bg: 'rgba(255,100,100,0.15)', color: '#ff6464' },
    ANY:    { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' }
};

class ZeroTreeItem extends LitElement {
    static properties = {
        title:      { type: String },
        subtitle:   { type: String },
        depth:      { type: Number },
        active:     { type: Boolean, reflect: true },
        expanded:   { type: Boolean, reflect: true },
        hasChildren:{ type: Boolean, reflect: true },
        itemType:   { type: String },  // 'collection' | 'folder' | 'request'
        itemKind:   { type: String },  // 'real' | 'mock' | 'proxy' | 'folder' | ''
        itemMethod: { type: String },  // 'GET' | 'POST' | ...
        menuItems:  { type: Array }
    };

    static styles = css`
        :host { display: block; }
        .row {
            display: grid;
            grid-template-columns: 20px minmax(0, 1fr) auto;
            align-items: center;
            gap: 6px;
            padding: 6px 8px;
            border-radius: 10px;
            color: #edf4ff;
            cursor: pointer;
            position: relative;
            transition: background 0.12s;
        }
        .row:hover { background: rgba(255,255,255,0.04); }
        :host([active]) .row {
            background: rgba(79,209,197,0.08);
            box-shadow: inset 2px 0 0 rgba(79,209,197,0.7);
        }
        .toggle {
            width: 18px;
            height: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            color: #9db0c7;
            cursor: pointer;
            user-select: none;
            flex-shrink: 0;
            font-size: 0.7rem;
            transition: color 0.12s;
        }
        .toggle:hover { color: #edf4ff; }
        .toggle.empty { cursor: default; opacity: 0.28; }
        .icon {
            font-size: 0.78rem;
            opacity: 0.7;
        }
        .content {
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
        }
        .label-group {
            min-width: 0;
            display: grid;
            gap: 1px;
        }
        .title {
            font-weight: 600;
            font-size: 0.86rem;
            line-height: 1.25;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .subtitle {
            color: #9db0c7;
            font-size: 0.74rem;
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .method-badge {
            display: inline-flex;
            align-items: center;
            padding: 1px 5px;
            border-radius: 5px;
            font-size: 0.62rem;
            font-weight: 800;
            letter-spacing: 0.04em;
            flex-shrink: 0;
            font-family: "SFMono-Regular", Menlo, monospace;
        }
        .kind-badge {
            display: inline-flex;
            align-items: center;
            padding: 1px 5px;
            border-radius: 5px;
            font-size: 0.62rem;
            font-weight: 700;
            letter-spacing: 0.03em;
            flex-shrink: 0;
        }
        .kind-mock    { background: rgba(79,209,197,0.12);  color: #4fd1c5; }
        .kind-proxy   { background: rgba(246,173,85,0.12);  color: #f6ad55; }
        .kind-real    { background: rgba(156,163,175,0.1);  color: #9ca3af; }
        .actions {
            display: inline-flex;
            align-items: center;
            opacity: 0;
            transition: opacity 0.15s;
        }
        .row:hover .actions { opacity: 1; }
        :host([active]) .actions { opacity: 1; }
        .menu-btn {
            width: 22px;
            height: 22px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            color: #9db0c7;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.12s, color 0.12s;
            letter-spacing: 0.01em;
        }
        .menu-btn:hover { background: rgba(255,255,255,0.08); color: #edf4ff; }
    `;

    constructor() {
        super();
        this.title = '';
        this.subtitle = '';
        this.depth = 0;
        this.active = false;
        this.expanded = false;
        this.hasChildren = false;
        this.itemType = 'request';
        this.itemKind = '';
        this.itemMethod = 'GET';
        this.menuItems = [];
    }

    _emitToggle(event) {
        event.stopPropagation();
        if (!this.hasChildren) return;
        this.dispatchEvent(new CustomEvent('toggle', { bubbles: true, composed: true }));
    }

    _emitSelect(event) {
        event.stopPropagation();
        this.dispatchEvent(new CustomEvent('select', { bubbles: true, composed: true }));
    }

    _openMenu(event) {
        event.stopPropagation();
        event.preventDefault();
        this.dispatchEvent(new CustomEvent('menu', {
            detail: { x: event.clientX, y: event.clientY },
            bubbles: true,
            composed: true
        }));
    }

    _onContextMenu(event) {
        event.preventDefault();
        this._openMenu(event);
    }

    _getIcon() {
        if (this.itemType === 'collection') return '⊞';
        if (this.itemType === 'folder') return this.expanded ? '📂' : '📁';
        return '';
    }

    _renderMethodBadge() {
        if (this.itemType !== 'request') return '';
        const method = (this.itemMethod || 'GET').toUpperCase();
        const colors = METHOD_COLORS[method] || METHOD_COLORS.ANY;
        return html`
            <span class="method-badge" style=${`background:${colors.bg}; color:${colors.color};`}>
                ${method}
            </span>
        `;
    }

    _renderKindBadge() {
        if (this.itemType !== 'request') return '';
        const kind = this.itemKind;
        if (kind === 'mock')  return html`<span class="kind-badge kind-mock">mock</span>`;
        if (kind === 'proxy') return html`<span class="kind-badge kind-proxy">proxy</span>`;
        return '';
    }

    render() {
        const paddingLeft = 8 + Number(this.depth || 0) * 16;
        const hasToggle = this.hasChildren || this.itemType === 'folder' || this.itemType === 'collection';
        return html`
            <div
                class="row"
                style=${`padding-left:${paddingLeft}px;`}
                @click=${this._emitSelect}
                @contextmenu=${this._onContextMenu}>
                <div
                    class=${'toggle' + (!hasToggle ? ' empty' : '')}
                    @click=${this._emitToggle}>
                    ${hasToggle
                        ? (this.expanded ? '▾' : '▸')
                        : html`<span class="icon">${this._getIcon()}</span>`
                    }
                </div>
                <div class="content">
                    ${this._renderMethodBadge()}
                    ${this.itemType === 'folder' || this.itemType === 'collection'
                        ? html`<span class="icon">${this._getIcon()}</span>`
                        : ''}
                    <div class="label-group">
                        <div class="title">${this.title}</div>
                        ${this.subtitle ? html`<div class="subtitle">${this.subtitle}</div>` : ''}
                    </div>
                    ${this._renderKindBadge()}
                </div>
                <div class="actions">
                    ${this.menuItems?.length ? html`
                        <div class="menu-btn" title="Options" @click=${this._openMenu}>⋯</div>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

customElements.define('zero-tree-item', ZeroTreeItem);
