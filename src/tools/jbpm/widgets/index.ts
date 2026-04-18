// --- ZERO-BPM INDUSTRIAL PROPERTY WIDGET REGISTRY (V1.0.0) ---

export { WIDGET_REGISTRY, Widget, WidgetContext } from './BaseWidget.js';

// Import widgets to trigger self-registration
import './InputWidget.js';
import './SelectWidget.js';
import './SnippetWidget.js';
import './KeyValueWidget.js';
