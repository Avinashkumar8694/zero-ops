import { LitElement, html, css } from 'lit';

class ZeroModal extends LitElement {
    static properties = {
        heading: { type: String },
        description: { type: String }
    };

    static styles = css`
        :host { display: contents; }
        dialog {
            width: min(860px, calc(100vw - 24px));
            max-height: calc(100vh - 32px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            background: #0f1720;
            color: #edf4ff;
            padding: 0;
            box-shadow: 0 30px 90px rgba(0,0,0,0.45);
        }
        dialog::backdrop { background: rgba(2, 8, 15, 0.65); }
        .shell { padding: 16px; display: grid; gap: 12px; }
        .head {
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
        }
        h3 {
            margin: 0;
            font-size: 0.92rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        p {
            margin: 4px 0 0;
            color: #9db0c7;
            font-size: 0.84rem;
            line-height: 1.45;
        }
    `;

    constructor() {
        super();
        this.heading = '';
        this.description = '';
    }

    get dialog() {
        return this.renderRoot?.querySelector('dialog');
    }

    showModal() {
        if (this.dialog && !this.dialog.open) this.dialog.showModal();
    }

    close() {
        if (this.dialog?.open) this.dialog.close();
    }

    handleClose() {
        this.dispatchEvent(new Event('close', { bubbles: true, composed: true }));
    }

    render() {
        return html`
            <dialog @close=${this.handleClose}>
                <div class="shell">
                    <div class="head">
                        <div>
                            ${this.heading ? html`<h3>${this.heading}</h3>` : ''}
                            ${this.description ? html`<p>${this.description}</p>` : ''}
                        </div>
                        <slot name="header-actions"></slot>
                    </div>
                    <slot></slot>
                </div>
            </dialog>
        `;
    }
}

customElements.define('zero-modal', ZeroModal);
