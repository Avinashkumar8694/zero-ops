import { LitElement, html, css } from 'lit';
import { fileToBase64 } from '/__mockdeck/public/shared/formatters.js';

class ZeroFilePicker extends LitElement {
    static properties = {
        label: { type: String },
        fileName: { type: String },
        value: { type: String }, // Base64
        disabled: { type: Boolean }
    };

    static styles = css`
        :host { display: block; margin-bottom: 12px; }
        .wrap { display: flex; flex-direction: column; gap: 6px; }
        label { font-size: 0.82rem; font-weight: 700; color: #cfe0f6; }
        .picker {
            display: flex; align-items: center; gap: 10px; padding: 10px 14px;
            background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px; font-size: 0.88rem; transition: border-color 0.2s, background 0.2s;
        }
        .picker:hover:not(.disabled) { border-color: rgba(79, 209, 197, 0.4); background: rgba(255, 255, 255, 0.06); }
        .picker.disabled { opacity: 0.5; cursor: not-allowed; }
        .file-info { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #9db0c7; }
        .file-info.active { color: #edf4ff; font-weight: 600; }
        input[type="file"] { display: none; }
        .btn {
            padding: 4px 10px; border-radius: 6px; background: rgba(79, 209, 197, 0.15); color: #4fd1c5;
            font-size: 0.72rem; font-weight: 800; text-transform: uppercase; cursor: pointer; border: none;
        }
        .btn.clear { background: rgba(255, 80, 80, 0.15); color: #ff6464; }
    `;

    async _handleChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.fileName = file.name;
        try {
            this.value = await fileToBase64(file);
            this.dispatchEvent(new CustomEvent('change', {
                detail: { fileName: this.fileName, value: this.value }
            }));
        } catch (err) {
            console.error('File Picker Error:', err);
        }
    }

    _clear() {
        this.fileName = '';
        this.value = '';
        this.shadowRoot.querySelector('input').value = '';
        this.dispatchEvent(new CustomEvent('change', {
            detail: { fileName: '', value: '' }
        }));
    }

    render() {
        return html`
            <div class="wrap">
                ${this.label ? html`<label>${this.label}</label>` : ''}
                <div class="picker ${this.disabled ? 'disabled' : ''}">
                    <div class="file-info ${this.fileName ? 'active' : ''}">
                        ${this.fileName || 'No file selected'}
                    </div>
                    ${this.fileName ? html`
                        <button class="btn clear" @click=${this._clear} ?disabled=${this.disabled}>Clear</button>
                    ` : html`
                        <button class="btn" @click=${() => this.shadowRoot.querySelector('input').click()} ?disabled=${this.disabled}>Select File</button>
                    `}
                    <input type="file" @change=${this._handleChange} ?disabled=${this.disabled}>
                </div>
            </div>
        `;
    }
}
customElements.define('zero-file-picker', ZeroFilePicker);
