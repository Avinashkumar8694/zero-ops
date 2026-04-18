import { Widget, WidgetContext, registerWidget } from './BaseWidget.js';

export class SelectWidget implements Widget {
    render(ctx: WidgetContext): string {
        const val = ctx.value || '';
        const options = ctx.options || [];
        
        return `
            <div class="form-group">
                <label class="form-label">${ctx.label}</label>
                <select data-key="${ctx.key}" class="form-input prop-input">
                    ${options.map(opt => `<option value="${opt}" ${opt === val ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
                ${ctx.description ? `<div class="form-help">${ctx.description}</div>` : ''}
            </div>
        `;
    }

    getValueFromScript(nodeId: string, key: string): string {
        return `document.querySelector('[data-key="${key}"]').value`;
    }
}

registerWidget('select', new SelectWidget());
