import { Widget, WidgetContext, registerWidget } from './BaseWidget.js';

export class KeyValueWidget implements Widget {
    render(ctx: WidgetContext): string {
        const val = ctx.value || {};
        const pairs = Object.entries(val);
        
        let html = `
            <div class="form-group">
                <label class="form-label">${ctx.label}</label>
                <div class="kv-container" id="kv-${ctx.key}" data-widget="keyvalue">
        `;

        pairs.forEach(([k, v]) => {
            html += this.renderRow(k, v);
        });

        if (pairs.length === 0) {
            html += this.renderRow('', '');
        }

        html += `
                </div>
                <button type="button" class="action-btn-sm" onclick="addKVRow('${ctx.key}')">
                    <i class="fas fa-plus"></i> Add Mapping Parameter
                </button>
                ${ctx.description ? `<div class="form-help">${ctx.description}</div>` : ''}
            </div>
        `;
        return html;
    }

    private renderRow(key: string, value: string): string {
        return `
            <div class="kv-row" style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="text" class="form-input kv-key" value="${key}" placeholder="Key" style="flex: 1;">
                <input type="text" class="form-input kv-val" value="${value}" placeholder="Value" style="flex: 1;">
                <button type="button" class="kv-btn" onclick="this.parentElement.remove()" style="padding: 0 12px; color: var(--error);">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    getValueFromScript(nodeId: string, key: string): string {
        // This script will be executed during modal save
        return `(() => {
            const rows = document.querySelectorAll('#kv-${key} .kv-row');
            const data = {};
            rows.forEach(r => {
                const k = r.querySelector('.kv-key').value;
                const v = r.querySelector('.kv-val').value;
                if (k) data[k] = v;
            });
            return data;
        })()`;
    }
}

registerWidget('keyvalue', new KeyValueWidget());
