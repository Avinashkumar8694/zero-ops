import { Widget, WidgetContext, registerWidget } from './BaseWidget.js';

export class SnippetWidget implements Widget {
    render(ctx: WidgetContext): string {
        const val = ctx.value || '';
        return `
            <div class="form-group">
                <label class="form-label">${ctx.label}</label>
                <textarea data-key="${ctx.key}" 
                          class="form-input prop-input" 
                          style="height: 120px; font-family: monospace; font-size: 12px; line-height: 1.5; background: #0f172a; color: #38bdf8; border: 1px solid #1e293b;"
                          placeholder="${ctx.placeholder || ''}">${val}</textarea>
                ${ctx.description ? `<div class="form-help">${ctx.description}</div>` : ''}
            </div>
        `;
    }

    getValueFromScript(nodeId: string, key: string): string {
        return `document.querySelector('[data-key="${key}"]').value`;
    }
}

registerWidget('snippet', new SnippetWidget());
registerWidget('textarea', new SnippetWidget());
