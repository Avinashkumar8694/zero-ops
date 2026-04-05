import { LitElement, html, css } from 'lit';

class ZeroStatGrid extends LitElement {
    static properties = {
        columns: { type: Number }
    };

    static styles = css`
        :host { display: block; }
        .grid {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(var(--columns, 4), minmax(0, 1fr));
        }
        @media (max-width: 1200px) {
            .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 600px) {
            .grid { grid-template-columns: 1fr; }
        }
    `;

    constructor() {
        super();
        this.columns = 4;
    }

    render() {
        return html`
            <div class="grid" style="--columns: ${this.columns}">
                <slot></slot>
            </div>
        `;
    }
}

customElements.define('zero-stat-grid', ZeroStatGrid);
