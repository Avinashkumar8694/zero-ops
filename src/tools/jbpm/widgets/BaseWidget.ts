/**
 * Zero-BPM Industrial Property Widget (V1.0.0)
 * Defines the standard interface for modular UI components in the property engine.
 */

export interface WidgetContext {
    key: string;
    label: string;
    value: any;
    placeholder?: string;
    description?: string;
    nodeId: string; // The BPMN element ID (e.g. ServiceTask_1)
    required?: boolean;
    options?: string[]; // For select widgets
}

export interface Widget {
    render(ctx: WidgetContext): string;
    getValueFromScript(nodeId: string, key: string): string; // JS snippet for modal save logic
}

export const WIDGET_REGISTRY: Record<string, Widget> = {};

export function registerWidget(type: string, widget: Widget) {
    WIDGET_REGISTRY[type] = widget;
}
