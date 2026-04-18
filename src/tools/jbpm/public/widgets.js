/**
 * Zero-BPM Industrial Property Widget Engine (V1.0.0)
 * Browser-side repository for modular UI components.
 */

window.ZeroWidgets = {
    registry: {},
    
    register(type, widget) {
        this.registry[type] = widget;
    },
    
    render(type, ctx, liveState = {}) {
        const widget = this.registry[type] || this.registry['text'];
        
        // 🛡️ Industrial Visibility Guard
        if (ctx.visibility) {
            try {
                const isVisible = new Function(...Object.keys(liveState), `return ${ctx.visibility}`)(...Object.values(liveState));
                if (!isVisible) return ''; // Skip rendering if condition fails
            } catch (e) {
                console.warn(`[Zero-BPM] Visibility Evaluation Failure for ${ctx.key}:`, e);
            }
        }

        return widget.render(ctx);
    },
    
    getExtractionLogic(type, nodeId, key) {
        const widget = this.registry[type] || this.registry['text'];
        return widget.getExtractionLogic(nodeId, key);
    }
};

// 🏛️ Industrial Widget: Input
ZeroWidgets.register('text', {
    render(ctx) {
        return `
            <div class="form-group">
                <label class="form-label">${ctx.label} ${ctx.required ? '<span style="color:var(--error);">*</span>' : ''}</label>
                <input type="text" data-key="${ctx.key}" class="form-input prop-input" value="${ctx.value || ''}" placeholder="${ctx.placeholder || ''}">
            </div>
        `;
    },
    getExtractionLogic(nodeId, key) {
        return `document.querySelector('[data-key="${key}"]').value`;
    }
});

// 🏛️ Industrial Widget: Select
ZeroWidgets.register('select', {
    render(ctx) {
        const options = ctx.options || [];
        return `
            <div class="form-group">
                <label class="form-label">${ctx.label}</label>
                <select data-key="${ctx.key}" class="form-input prop-input">
                    ${options.map(opt => `<option value="${opt}" ${opt === ctx.value ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            </div>
        `;
    },
    getExtractionLogic(nodeId, key) {
        return `document.querySelector('[data-key="${key}"]').value`;
    }
});

// 🏛️ Industrial Widget: KeyValue Mapping
ZeroWidgets.register('keyvalue', {
    render(ctx) {
        const val = ctx.value || {};
        const pairs = Object.entries(val);
        let html = `
            <div class="form-group">
                <label class="form-label">${ctx.label}</label>
                <div class="kv-container" id="kv-${ctx.key}">
        `;
        
        const renderRow = (k, v) => `
            <div class="kv-row" style="display:flex; gap:8px; margin-bottom:8px;">
                <input type="text" class="form-input kv-key" value="${k}" style="flex:1;" placeholder="Key">
                <input type="text" class="form-input kv-val" value="${v}" style="flex:1;" placeholder="Value">
                <button class="kv-btn" onclick="this.parentElement.remove()" style="padding:0 8px; color:var(--error);"><i class="fas fa-trash"></i></button>
            </div>
        `;

        pairs.forEach(([k, v]) => html += renderRow(k, v));
        if (pairs.length === 0) html += renderRow('', '');

        html += `
                </div>
                <button class="action-btn-sm" onclick="addKVRow('${ctx.key}')"><i class="fas fa-plus"></i> Add Entry</button>
            </div>
        `;
        return html;
    },
    getExtractionLogic(nodeId, key) {
        return `(() => {
            const data = {};
            document.querySelectorAll('#kv-${key} .kv-row').forEach(r => {
                const k = r.querySelector('.kv-key').value;
                const v = r.querySelector('.kv-val').value;
                if (k) data[k] = v;
            });
            return data;
        })()`;
    }
});

// Utility for dynamic row addition
window.addKVRow = (key) => {
    const container = document.getElementById(`kv-${key}`);
    const row = document.createElement('div');
    row.className = 'kv-row';
    row.style = 'display:flex; gap:8px; margin-bottom:8px;';
    row.innerHTML = `
        <input type="text" class="form-input kv-key" style="flex:1;" placeholder="Key">
        <input type="text" class="form-input kv-val" style="flex:1;" placeholder="Value">
        <button class="kv-btn" onclick="this.parentElement.remove()" style="padding:0 8px; color:var(--error);"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(row);
};
