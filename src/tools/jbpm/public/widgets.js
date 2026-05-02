/**
 * Zero-BPM Industrial Property Widget Engine (V2.2.0)
 * Browser-side repository for modular UI components.
 */

window.ZeroWidgets = {
    registry: {},
    dataTypes: ['string', 'number', 'boolean', 'object', 'array', 'json', 'date', 'any'],

    register(type, widget) {
        this.registry[type] = widget;
    },

    render(type, ctx, liveState = {}) {
        const widget = this.registry[type] || this.registry['text'];

        if (ctx.visibility) {
            try {
                const isVisible = new Function(...Object.keys(liveState), `return ${ctx.visibility}`)(...Object.values(liveState));
                if (!isVisible) return '';
            } catch (e) {
                console.warn(`[Zero-BPM] Visibility Evaluation Failure for ${ctx.key}:`, e);
            }
        }

        return widget.render(ctx);
    },

    getExtractionLogic(type, nodeId, key) {
        const widget = this.registry[type] || this.registry['text'];
        return widget.getExtractionLogic(nodeId, key);
    },

    escape(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    getKVMode(ctx) {
        if (ctx.mapping) return 'mapping';
        if (ctx.group === 'variables' || ['variableDefinitions', 'localVariables'].includes(ctx.key)) return 'variable';
        return 'basic';
    },

    getKVRowModel(mode, value) {
        const isObject = value && typeof value === 'object' && !Array.isArray(value);
        if (mode === 'mapping') {
            return {
                value: isObject ? (value.target ?? '') : (value ?? ''),
                type: isObject ? (value.type || 'any') : 'any'
            };
        }
        if (mode === 'variable') {
            return {
                value: isObject ? (value.defaultValue ?? '') : (value ?? ''),
                type: isObject ? (value.type || 'string') : 'string'
            };
        }
        return {
            value: value ?? '',
            type: ''
        };
    }
};

let zeroAutocompleteId = 0;

function nextAutocompleteId(prefix = 'zero-ac') {
    zeroAutocompleteId += 1;
    return `${prefix}-${zeroAutocompleteId}`;
}

function normalizeSuggestionItems(options) {
    return (options || []).map(option => {
        if (typeof option === 'string') return { value: option, group: 'Suggestions' };
        return {
            value: option?.value || option?.label || '',
            group: option?.group || 'Suggestions'
        };
    }).filter(option => option.value);
}

function renderAutocompletePanel(panelId) {
    return `<div class="zero-autocomplete-panel" id="${panelId}" hidden></div>`;
}

function renderAutocompleteInput(inputClass, value, placeholder, suggestions, panelId, extraAttrs = '') {
    const encoded = ZeroWidgets.escape(JSON.stringify(normalizeSuggestionItems(suggestions)));
    return `
        <div class="zero-autocomplete" data-panel-id="${panelId}">
            <input type="text" class="${inputClass} zero-autocomplete-input" value="${ZeroWidgets.escape(value || '')}" placeholder="${ZeroWidgets.escape(placeholder || '')}" autocomplete="off" spellcheck="false" data-suggestions="${encoded}" data-panel-id="${panelId}" ${extraAttrs}>
            ${renderAutocompletePanel(panelId)}
        </div>
    `;
}

function renderMappingEndpoint(side, value, placeholder, datalistId, options, scope) {
    const safeValue = ZeroWidgets.escape(value || '');
    const sideClass = side === 'source' ? 'kv-key' : 'kv-val';
    const safeScope = ZeroWidgets.escape((scope || side).toUpperCase());
    const suggestionCount = (options || []).length;
    const panelId = nextAutocompleteId(`${datalistId || 'suggestions'}-${side}`);

    return `
        <div class="premium-kv-endpoint" data-side="${side}">
            <div class="premium-kv-endpoint-label">
                <span>${safeScope}</span>
                ${suggestionCount ? `<span class="premium-kv-endpoint-badge">${suggestionCount} suggestions</span>` : '<span class="premium-kv-endpoint-badge premium-kv-endpoint-badge-muted">free input</span>'}
            </div>
            <div class="premium-kv-endpoint-body">
                ${renderAutocompleteInput(`form-input ${sideClass} premium-kv-combo`, safeValue, placeholder, options, panelId)}
            </div>
        </div>
    `;
}

ZeroWidgets.register('text', {
    render(ctx) {
        const hasSuggestions = (ctx.suggestions || []).length > 0;
        const panelId = nextAutocompleteId(`panel-${ctx.nodeId || 'field'}-${ctx.key}`);
        return `
            <div class="form-group">
                <label class="form-label">${ctx.label} ${ctx.required ? '<span style="color:var(--error);">*</span>' : ''}</label>
                ${hasSuggestions
                    ? renderAutocompleteInput('form-input prop-input', ctx.value || '', ctx.placeholder || '', ctx.suggestions || [], panelId, `data-key="${ctx.key}"`)
                    : `<input type="text" data-key="${ctx.key}" class="form-input prop-input" value="${ZeroWidgets.escape(ctx.value || '')}" placeholder="${ZeroWidgets.escape(ctx.placeholder || '')}">`
                }
                ${ctx.description ? `<div style="font-size:10px; opacity:0.6; margin-top:4px;">${ctx.description}</div>` : ''}
            </div>
        `;
    },
    getExtractionLogic(nodeId, key) {
        return `document.querySelector('[data-key="${key}"]').value`;
    }
});

ZeroWidgets.register('select', {
    render(ctx) {
        const options = ctx.options || [];
        return `
            <div class="form-group">
                <label class="form-label">${ctx.label}</label>
                <select data-key="${ctx.key}" class="form-input prop-input">
                    ${options.map(opt => `<option value="${ZeroWidgets.escape(opt)}" ${opt === ctx.value ? 'selected' : ''}>${ZeroWidgets.escape(opt)}</option>`).join('')}
                </select>
                ${ctx.description ? `<div style="font-size:10px; opacity:0.6; margin-top:4px;">${ctx.description}</div>` : ''}
            </div>
        `;
    },
    getExtractionLogic(nodeId, key) {
        return `document.querySelector('[data-key="${key}"]').value`;
    }
});

ZeroWidgets.register('snippet', {
    render(ctx) {
        const isJson = ctx.dataType === 'json';
        const value = typeof ctx.value === 'string'
            ? ctx.value
            : (ctx.value ? JSON.stringify(ctx.value, null, 2) : '');

        return `
            <div class="form-group">
                <label class="form-label">${ctx.label} ${ctx.required ? '<span style="color:var(--error);">*</span>' : ''}</label>
                <textarea data-key="${ctx.key}" class="form-input prop-input premium-snippet-input" placeholder="${ZeroWidgets.escape(ctx.placeholder || (isJson ? '{\n  "field": "type"\n}' : 'Enter code or structured content'))}" spellcheck="false">${ZeroWidgets.escape(value)}</textarea>
                <div class="premium-snippet-footer">
                    <span>${isJson ? 'JSON contract editor' : 'Structured snippet editor'}</span>
                    <span>${isJson ? 'Multi-line, validated, and used for mapping suggestions' : 'Multi-line editor for scripts or structured content'}</span>
                </div>
                ${ctx.description ? `<div style="font-size:10px; opacity:0.6; margin-top:6px;">${ctx.description}</div>` : ''}
            </div>
        `;
    },
    getExtractionLogic(nodeId, key) {
        return `document.querySelector('[data-key="${key}"]').value`;
    }
});

ZeroWidgets.register('keyvalue', {
    render(ctx) {
        const val = ctx.value || {};
        const pairs = Object.entries(val);
        const mode = ZeroWidgets.getKVMode(ctx);
        const sourceScope = ctx.mapping?.sourceScope || 'source';
        const targetScope = ctx.mapping?.targetScope || 'target';
        const sourceSuggestions = ctx.mappingSuggestions?.source || [];
        const targetSuggestions = ctx.mappingSuggestions?.target || [];
        const sourceListId = `${ctx.nodeId}-${ctx.key}-source-options`;
        const targetListId = `${ctx.nodeId}-${ctx.key}-target-options`;

        const renderTypeOptions = (selected) => ZeroWidgets.dataTypes
            .map(type => `<option value="${type}" ${type === selected ? 'selected' : ''}>${type}</option>`)
            .join('');

        const renderRow = (k, v) => {
            const row = ZeroWidgets.getKVRowModel(mode, v);
            const key = ZeroWidgets.escape(k);
            const value = ZeroWidgets.escape(row.value);
            const type = ZeroWidgets.escape(row.type);

            if (mode === 'variable') {
                return `
                    <div class="kv-row premium-kv-row premium-kv-row-variable">
                        <div class="premium-kv-main">
                            <input type="text" class="form-input kv-key" value="${key}" placeholder="Variable Name" ${ctx.datalistId ? `list="${ctx.datalistId}"` : ''}>
                            <select class="form-input kv-type">${renderTypeOptions(type)}</select>
                            <input type="text" class="form-input kv-val" value="${value}" placeholder="Default Value / Expression">
                        </div>
                        <button type="button" class="premium-kv-delete" onclick="this.closest('.kv-row').remove()"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            }

            if (mode === 'mapping') {
                return `
                    <div class="kv-row premium-kv-row premium-kv-row-mapping">
                        <div class="premium-kv-main premium-kv-mapping-main">
                            <div class="premium-kv-col">
                                ${renderMappingEndpoint('source', key, 'Source / Input / JSONPath / Expression', sourceSuggestions.length ? sourceListId : null, sourceSuggestions, sourceScope)}
                            </div>
                            <div class="premium-kv-arrow"><i class="fas fa-arrow-right"></i></div>
                            <div class="premium-kv-col">
                                ${renderMappingEndpoint('target', value, 'Target Variable / Output Key', targetSuggestions.length ? targetListId : null, targetSuggestions, targetScope)}
                            </div>
                            <select class="form-input kv-type premium-kv-type">${renderTypeOptions(type)}</select>
                        </div>
                        <button type="button" class="premium-kv-delete" onclick="this.closest('.kv-row').remove()"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            }

            return `
                <div class="kv-row premium-kv-row">
                    <div class="premium-kv-main">
                        <input type="text" class="form-input kv-key" value="${key}" placeholder="Key" ${ctx.datalistId ? `list="${ctx.datalistId}"` : ''}>
                        <input type="text" class="form-input kv-val" value="${value}" placeholder="Value" ${ctx.datalistId ? `list="${ctx.datalistId}"` : ''}>
                    </div>
                    <button type="button" class="premium-kv-delete" onclick="this.closest('.kv-row').remove()"><i class="fas fa-trash"></i></button>
                </div>
            `;
        };

        let html = `
            <div class="form-group">
                <label class="form-label">${ctx.label}</label>
                <div class="kv-container premium-kv" id="kv-${ctx.key}" data-mode="${mode}" data-list-id="${ctx.datalistId || ''}" data-source-scope="${sourceScope}" data-target-scope="${targetScope}" data-source-list-id="${sourceListId}" data-target-list-id="${targetListId}" data-source-options='${ZeroWidgets.escape(JSON.stringify(sourceSuggestions))}' data-target-options='${ZeroWidgets.escape(JSON.stringify(targetSuggestions))}'>
        `;

        pairs.forEach(([k, v]) => html += renderRow(k, v));
        if (pairs.length === 0) html += renderRow('', '');

        html += `
                </div>
                <button type="button" class="premium-add-btn" onclick="addKVRow('${ctx.key}')"><i class="fas fa-plus"></i> Add Entry</button>
                ${ctx.mapping ? `<div class="premium-kv-hint">Typed mapping from ${sourceScope} to ${targetScope}. Use expressions, variable refs, request paths, service outputs, or subprocess contracts.</div>` : ''}
                ${ctx.description ? `<div style="font-size:10px; opacity:0.6; margin-top:4px;">${ctx.description}</div>` : ''}
            </div>
        `;
        return html;
    },
    getExtractionLogic(nodeId, key) {
        return `(() => {
            const data = {};
            const container = document.getElementById('kv-${key}');
            const mode = container ? container.getAttribute('data-mode') : 'basic';
            const sourceScope = container ? container.getAttribute('data-source-scope') : 'source';
            const targetScope = container ? container.getAttribute('data-target-scope') : 'target';
            document.querySelectorAll('#kv-${key} .kv-row').forEach(r => {
                const sourceInput = r.querySelector('.kv-key');
                const targetInput = r.querySelector('.kv-val');
                const k = sourceInput ? sourceInput.value : '';
                const v = targetInput ? targetInput.value : '';
                const t = r.querySelector('.kv-type') ? r.querySelector('.kv-type').value : '';
                if (!k) return;
                if (mode === 'variable') {
                    data[k] = { type: t || 'string', defaultValue: v };
                    return;
                }
                if (mode === 'mapping') {
                    data[k] = { target: v, type: t || 'any', sourceScope, targetScope };
                    return;
                }
                data[k] = v;
            });
            return data;
        })()`;
    }
});

window.addKVRow = (key) => {
    const container = document.getElementById(`kv-${key}`);
    const row = document.createElement('div');
    const datalistAttr = container.getAttribute('data-list-id') ? `list="${container.getAttribute('data-list-id')}"` : '';
    const mode = container.getAttribute('data-mode') || 'basic';
    const sourceScope = (container.getAttribute('data-source-scope') || 'source').toUpperCase();
    const targetScope = (container.getAttribute('data-target-scope') || 'target').toUpperCase();
    const sourceListId = container.getAttribute('data-source-list-id');
    const targetListId = container.getAttribute('data-target-list-id');
    const sourceOptions = JSON.parse(container.getAttribute('data-source-options') || '[]');
    const targetOptions = JSON.parse(container.getAttribute('data-target-options') || '[]');
    const typeOptions = ZeroWidgets.dataTypes.map(type => `<option value="${type}">${type}</option>`).join('');

    row.className = 'kv-row premium-kv-row';

    if (mode === 'variable') {
        row.classList.add('premium-kv-row-variable');
        row.innerHTML = `
            <div class="premium-kv-main">
                <input type="text" class="form-input kv-key" placeholder="Variable Name" ${datalistAttr}>
                <select class="form-input kv-type">${typeOptions}</select>
                <input type="text" class="form-input kv-val" placeholder="Default Value / Expression">
            </div>
            <button type="button" class="premium-kv-delete" onclick="this.closest('.kv-row').remove()"><i class="fas fa-trash"></i></button>
        `;
    } else if (mode === 'mapping') {
        row.classList.add('premium-kv-row-mapping');
        row.innerHTML = `
            <div class="premium-kv-main premium-kv-mapping-main">
                <div class="premium-kv-col">
                    ${renderMappingEndpoint('source', '', 'Source / Input / JSONPath / Expression', sourceOptions.length ? sourceListId : null, sourceOptions, sourceScope)}
                </div>
                <div class="premium-kv-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="premium-kv-col">
                    ${renderMappingEndpoint('target', '', 'Target Variable / Output Key', targetOptions.length ? targetListId : null, targetOptions, targetScope)}
                </div>
                <select class="form-input kv-type premium-kv-type">${typeOptions}</select>
            </div>
            <button type="button" class="premium-kv-delete" onclick="this.closest('.kv-row').remove()"><i class="fas fa-trash"></i></button>
        `;
    } else {
        row.innerHTML = `
            <div class="premium-kv-main">
                <input type="text" class="form-input kv-key" placeholder="Key" ${datalistAttr}>
                <input type="text" class="form-input kv-val" placeholder="Value" ${datalistAttr}>
            </div>
            <button type="button" class="premium-kv-delete" onclick="this.closest('.kv-row').remove()"><i class="fas fa-trash"></i></button>
        `;
    }

    container.appendChild(row);
};

function rankSuggestionItems(items, query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    return [...items]
        .map(item => {
            const value = String(item.value || '');
            const haystack = value.toLowerCase();
            let score = 0;

            if (!normalizedQuery) score = 1;
            else if (haystack === normalizedQuery) score = 400;
            else if (haystack.startsWith(normalizedQuery)) score = 300;
            else if (haystack.includes(normalizedQuery)) score = 200;
            else return null;

            if (/^\$\./.test(value)) score += 10;
            if (/^\$\{/.test(value)) score += 6;

            return { ...item, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value));
}

function renderAutocompleteResults(panel, input) {
    const raw = input.getAttribute('data-suggestions') || '[]';
    let items = [];

    try {
        items = JSON.parse(raw);
    } catch (e) {
        items = [];
    }

    const ranked = rankSuggestionItems(items, input.value).slice(0, 12);
    if (!ranked.length) {
        panel.hidden = true;
        panel.innerHTML = '';
        return;
    }

    const groups = ranked.reduce((acc, item) => {
        const key = item.group || 'Suggestions';
        acc[key] = acc[key] || [];
        acc[key].push(item);
        return acc;
    }, {});

    panel.innerHTML = Object.entries(groups).map(([group, groupItems]) => `
        <div class="zero-autocomplete-group">
            <div class="zero-autocomplete-group-label">${ZeroWidgets.escape(group)}</div>
            ${groupItems.map(item => `
                <button type="button" class="zero-autocomplete-item" data-value="${ZeroWidgets.escape(item.value)}">
                    <span class="zero-autocomplete-item-value">${ZeroWidgets.escape(item.value)}</span>
                </button>
            `).join('')}
        </div>
    `).join('');

    panel.hidden = false;
}

function closeAutocompletePanels(exceptId) {
    document.querySelectorAll('.zero-autocomplete-panel').forEach(panel => {
        if (exceptId && panel.id === exceptId) return;
        panel.hidden = true;
    });
}

document.addEventListener('focusin', (event) => {
    const input = event.target.closest('.zero-autocomplete-input');
    if (!input) return;
    const panel = document.getElementById(input.getAttribute('data-panel-id'));
    if (!panel) return;
    closeAutocompletePanels(panel.id);
    renderAutocompleteResults(panel, input);
});

document.addEventListener('input', (event) => {
    const input = event.target.closest('.zero-autocomplete-input');
    if (!input) return;
    const panel = document.getElementById(input.getAttribute('data-panel-id'));
    if (!panel) return;
    renderAutocompleteResults(panel, input);
});

document.addEventListener('mousedown', (event) => {
    const item = event.target.closest('.zero-autocomplete-item');
    if (item) {
        const panel = item.closest('.zero-autocomplete-panel');
        const root = panel ? panel.closest('.zero-autocomplete') : null;
        const input = root ? root.querySelector('.zero-autocomplete-input') : null;
        if (input) {
            input.value = item.getAttribute('data-value') || '';
            panel.hidden = true;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.focus();
        }
        event.preventDefault();
        return;
    }

    if (!event.target.closest('.zero-autocomplete')) {
        closeAutocompletePanels();
    }
});
