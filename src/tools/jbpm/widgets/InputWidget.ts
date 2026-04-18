import { Widget, WidgetContext, registerWidget } from './BaseWidget.js';

export class InputWidget implements Widget {
    render(ctx: WidgetContext): string {
        const val = ctx.value !== undefined ? ctx.value : '';
        return `
            <div class="form-group">
                <label class="form-label">${ctx.label} ${ctx.required ? '<span style="color:var(--error);">*</span>' : ''}</label>
                <input type="text" 
                       data-key="${ctx.key}" 
                       class="form-input prop-input" 
                       value="${val}" 
                       placeholder="${ctx.placeholder || ''}">
                ${ctx.description ? `<div class="form-help">${ctx.description}</div>` : ''}
            </div>
        `;
    }

    getValueFromScript(nodeId: string, key: string): string {
        return `document.querySelector('[data-key="${key}"]').value`;
    }
}

registerWidget('text', new InputWidget());
registerWidget('number', new InputWidget());
