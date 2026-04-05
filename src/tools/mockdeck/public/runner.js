import { LitElement, html, css, svg } from 'lit';
import '/lit_component/zero-badge.js';
import '/lit_component/zero-button.js';
import '/lit_component/zero-list-item.js';
import '/lit_component/zero-modal.js';
import '/lit_component/zero-panel.js';
import '/lit_component/zero-stat-card.js';
import '/lit_component/zero-section.js';
import '/lit_component/zero-stat-grid.js';
import '/lit_component/zero-empty-state.js';
import '/lit_component/zero-input.js';
import '/lit_component/zero-textarea.js';
import '/lit_component/zero-select.js';
import '/lit_component/zero-file-picker.js';
import { api } from './shared/http.js';
import { objectFromText, textFromObject, fileToBase64 } from './shared/formatters.js';
import { METHODS, deepClone, emptyNode, startNode, emptyWorkflow, getNodeSize } from './shared/runner-model.js';

const CONNECTOR_DEBUG = true;

function connectorLog(...args) {
    if (!CONNECTOR_DEBUG) return;
    console.log('[MockDeck Connector]', ...args);
}

class MockDeckRunner extends LitElement {
    static properties = {
        runnerApiBase:        { state: true },
        runnerBase:           { state: true },
        uiBase:               { state: true },
        state:                { state: true },
        workflow:             { state: true },
        selectedNodeId:       { state: true },
        runState:             { state: true },
        datasetPreview:       { state: true },
        toast:                { state: true },
        connectorDrag:        { state: true },
        sidebarCollapsed:     { state: true },
        dialogNodeId:         { state: true },
        dialogTab:            { state: true },
        runHistory:           { state: true },
        selectedRunId:        { state: true },
        expandedScenarioKey:  { state: true },
        libraryDragOver:      { state: true },
        view:                 { state: true },
        selectedEventId:      { state: true },
        selectedTraceTab:     { state: true }
    };

    addNodeFormDataRow() {
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map(n => {
                if (n.id !== this.selectedNodeId) return n;
                const rows = [...(n.formData || [])];
                rows.push({ key: '', value: '', type: 'text', fileName: '' });
                return { ...n, formData: rows };
            })
        };
    }

    removeNodeFormDataRow(index) {
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map(n => {
                if (n.id !== this.selectedNodeId) return n;
                const rows = [...(n.formData || [])];
                rows.splice(index, 1);
                return { ...n, formData: rows };
            })
        };
    }

    updateNodeFormDataRow(index, field, value, fileName = null) {
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map(n => {
                if (n.id !== this.selectedNodeId) return n;
                const rows = [...(n.formData || [])];
                rows[index] = { ...rows[index], [field]: value };
                if (fileName) rows[index].fileName = fileName;
                return { ...n, formData: rows };
            })
        };
    }

    static styles = css`
        :host { display: block; padding: 16px; color: #edf4ff; font-family: 'Inter', system-ui, sans-serif; }
        .shell { max-width: 1680px; margin: 0 auto; display: grid; gap: 14px; }
        .hero { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 14px; align-items: start; }
        .title {
            padding: 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08);
            background: radial-gradient(circle at top left, rgba(246,173,85,0.18), transparent 34%), linear-gradient(135deg, rgba(79,209,197,0.1), rgba(255,255,255,0.03));
            box-shadow: 0 20px 48px rgba(0,0,0,0.22);
        }
        h1 { margin: 0 0 8px; font-size: clamp(1.6rem, 3vw, 2.6rem); line-height: 0.96; letter-spacing: -0.04em; }
        .lead { margin: 0; color: #d4e3f6; line-height: 1.5; font-size: 0.88rem; }
        .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .runner-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
        .runner-layout.sidebar-hidden { grid-template-columns: 1fr 0; }
        .left-col { display: grid; gap: 14px; }
        .right-col { display: grid; gap: 10px; overflow: hidden; transition: opacity 0.2s; }
        .runner-layout.sidebar-hidden .right-col { opacity: 0; pointer-events: none; }

        /* Canvas */
        .board-wrap {
            position: relative; border-radius: 16px; overflow: auto;
            background:
                linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
                linear-gradient(180deg, rgba(4,12,22,0.9), rgba(8,16,26,0.98));
            background-size: 24px 24px, 24px 24px, auto;
            border: 1px solid rgba(255,255,255,0.07);
            min-height: 800px;
        }
        .board-wrap.drag-over { border-color: rgba(246,173,85,0.6); box-shadow: inset 0 0 0 3px rgba(246,173,85,0.1); }
        .board { position: relative; width: max(100%, 2400px); min-height: 1200px; }
        svg.links { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; overflow: visible; pointer-events: auto; }

        /* Compact nodes */
        .node {
            position: absolute; width: 176px; height: 72px; padding: 10px 12px; border-radius: 13px;
            box-sizing: border-box;
            background: linear-gradient(135deg, rgba(12,22,34,0.98), rgba(16,28,42,0.95));
            border: 1px solid rgba(255,255,255,0.09);
            box-shadow: 0 12px 28px rgba(0,0,0,0.28);
            cursor: grab; user-select: none; z-index: 2; touch-action: none;
            transition: box-shadow 0.15s, border-color 0.15s;
        }
        .node:hover { border-color: rgba(255,255,255,0.16); }
        .node.selected { border-color: rgba(79,209,197,0.85); box-shadow: 0 0 0 2px rgba(79,209,197,0.18), 0 16px 36px rgba(79,209,197,0.18); }
        .node.drop-target { border-color: rgba(246,173,85,0.9); box-shadow: 0 0 0 3px rgba(246,173,85,0.15); }
        .node.start-node { width: 130px; border-color: rgba(246,173,85,0.6); background: rgba(28,20,8,0.95); }
        .node-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .node-method {
            display: inline-flex; padding: 1px 5px; border-radius: 5px;
            font-size: 0.6rem; font-weight: 800; letter-spacing: 0.04em;
            font-family: monospace; background: rgba(79,209,197,0.14); color: #4fd1c5; flex-shrink: 0;
        }
        .node-method.start { background: rgba(246,173,85,0.14); color: #f6ad55; }
        .node-name { font-size: 0.84rem; font-weight: 700; line-height: 1.2; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .node-hint { font-size: 0.7rem; color: #9db0c7; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
        .node-status { display: flex; align-items: center; gap: 5px; margin-top: 5px; }
        .status-dot {
            width: 7px; height: 7px; border-radius: 50%; background: #9db0c7; flex-shrink: 0;
        }
        .status-dot.running { background: #f6ad55; animation: pulse 1s infinite; }
        .status-dot.done { background: #4fd1c5; }
        .status-dot.error { background: #ff6464; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        .node-entry-handle, .node-exit-handle {
            position: absolute; top: calc(50% - 9px);
            width: 18px; height: 18px; border-radius: 50%;
            border: 2px solid rgba(79,209,197,0.9); background: #0f1720;
            display: flex; align-items: center; justify-content: center;
            cursor: crosshair; touch-action: none;
            transition: transform 0.12s;
        }
        .node-entry-handle:hover, .node-exit-handle:hover { transform: scale(1.25); }
        .node-entry-handle { left: -10px; }
        .node-exit-handle { right: -10px; }
        .node-entry-handle::after, .node-exit-handle::after {
            content: ''; width: 6px; height: 6px; border-radius: 50%; background: #7be7dd;
        }

        /* SVG edges */
        .edge-delete { pointer-events: all; cursor: pointer; fill: rgba(252,129,129,0.95); stroke: rgba(15,23,32,0.95); stroke-width: 2; }
        .edge-delete-text { pointer-events: none; fill: white; font-size: 11px; font-family: sans-serif; text-anchor: middle; dominant-baseline: central; }
        .edge-core { filter: drop-shadow(0 0 8px rgba(79,209,197,0.2)); }
        .edge-draft { filter: drop-shadow(0 0 8px rgba(246,173,85,0.2)); }

        /* Panel / form shared */
        .panel { background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; }
        .panel-heading { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: #9db0c7; margin: 0 0 10px; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .cols { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
        .hint { color: #9db0c7; font-size: 0.8rem; line-height: 1.5; }

        /* Monitor Drilldown CSS */
        .event-list { display: grid; gap: 6px; }
        .node-event {
            background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
            border-radius: 12px; padding: 12px; cursor: pointer; transition: 0.2s; position: relative;
        }
        .node-event:hover { background: rgba(255,255,255,0.04); border-color: rgba(79,209,197,0.3); }
        .node-event.active { border-color: #4fd1c5; background: rgba(79,209,197,0.05); box-shadow: 0 0 20px rgba(79,209,197,0.07); }
        .node-event.ok { border-left: 3px solid #4fd1c5; }
        .node-event.fail { border-left: 3px solid #ff6464; }
        .node-event-meta { display: flex; gap: 10px; font-size: 0.72rem; color: #9db0c7; margin-top: 4px; align-items: center; }
        .node-event-status { padding: 1px 6px; border-radius: 4px; background: rgba(0,0,0,0.25); font-weight: 800; font-family: monospace; color: #cfe0f6; }
        
        .trace-panel { 
            margin-top: 12px; padding: 16px; background: rgba(0,0,0,0.25); border-radius: 14px; 
            border: 1px solid rgba(255,255,255,0.08); font-size: 0.82rem; line-height: 1.4;
            cursor: default;
        }
        .trace-tabs { display: flex; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 12px; }
        .trace-tab { padding-bottom: 6px; cursor: pointer; color: #9db0c7; font-weight: 700; border-bottom: 2px solid transparent; font-size: 0.75rem; text-transform: uppercase; }
        .trace-tab.active { color: #4fd1c5; border-bottom-color: #4fd1c5; }
        .trace-section { margin-bottom: 16px; }
        .trace-label { font-size: 0.65rem; font-weight: 800; color: #4fd1c5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; opacity: 0.8; }
        .trace-value { color: #cfe0f6; word-break: break-all; font-family: monospace; }
        .trace-pre { 
            background: #06101a; padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); 
            margin: 4px 0; overflow: auto; max-height: 380px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.76rem;
            color: #a5d6ff; line-height: 1.5;
        }

        /* Node Library drag items */
        .lib-item {
            padding: 8px 10px; border-radius: 10px;
            background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
            cursor: grab; display: flex; align-items: center; gap: 8px;
            transition: background 0.12s, border-color 0.12s;
        }
        .lib-item:hover { background: rgba(79,209,197,0.08); border-color: rgba(79,209,197,0.25); cursor: grab; }
        .lib-item:active { cursor: grabbing; }
        .lib-kind { display: inline-flex; padding: 1px 5px; border-radius: 5px; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.03em; font-family: monospace; flex-shrink: 0; }
        .lib-real  { background: rgba(156,163,175,0.12); color: #9ca3af; }
        .lib-mock  { background: rgba(79,209,197,0.12);  color: #4fd1c5; }
        .lib-proxy { background: rgba(246,173,85,0.12);  color: #f6ad55; }
        .lib-custom{ background: rgba(167,139,250,0.12); color: #a78bfa; }
        .lib-name { font-size: 0.82rem; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lib-col { font-size: 0.72rem; color: #9db0c7; }

        /* Dialog tabs */
        .dialog-tabs { display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 14px; }
        .dialog-tab { padding: 8px 12px; border-radius: 10px 10px 0 0; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: #9db0c7; transition: color 0.12s, background 0.12s; }
        .dialog-tab:hover { color: #edf4ff; }
        .dialog-tab.active { color: #4fd1c5; border-bottom: 2px solid #4fd1c5; margin-bottom: -1px; }
        .dialog-body { display: grid; gap: 10px; }

        /* Run history */
        .run-list { display: grid; gap: 8px; }
        .run-card {
            padding: 10px 12px; border-radius: 12px;
            background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
            cursor: pointer; transition: border-color 0.12s, background 0.12s;
        }
        .run-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(79,209,197,0.2); }
        .run-card.active { border-color: rgba(79,209,197,0.6); background: rgba(79,209,197,0.05); }
        .run-header { display: flex; align-items: center; gap: 8px; }
        .run-name { font-size: 0.86rem; font-weight: 700; flex: 1; }
        .status-badge { display: inline-flex; padding: 2px 7px; border-radius: 999px; font-size: 0.66rem; font-weight: 700; }
        .status-running { background: rgba(246,173,85,0.15); color: #f6ad55; }
        .status-done { background: rgba(79,209,197,0.12); color: #4fd1c5; }
        .status-error { background: rgba(255,80,80,0.12); color: #ff6464; }
        .run-meta { display: flex; gap: 10px; margin-top: 4px; font-size: 0.74rem; color: #9db0c7; }
        .scenario-list { display: grid; gap: 6px; margin-top: 10px; }
        .scenario-row {
            padding: 8px 10px; border-radius: 10px;
            background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
            cursor: pointer; font-size: 0.8rem;
        }
        .scenario-row:hover { border-color: rgba(79,209,197,0.2); }
        .node-event {
            padding: 8px 10px; border-radius: 10px;
            background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
            font-size: 0.78rem; display: grid; gap: 3px;
        }
        .node-event.ok { border-left: 3px solid #4fd1c5; }
        .node-event.fail { border-left: 3px solid #ff6464; }
        .node-event-meta { display: flex; gap: 8px; color: #9db0c7; flex-wrap: wrap; }

        /* Analytics bar chart */
        .bar-chart { display: grid; gap: 8px; }
        .bar-row { display: grid; grid-template-columns: 120px 1fr 60px; gap: 8px; align-items: center; font-size: 0.78rem; }
        .bar-track { height: 8px; border-radius: 99px; background: rgba(255,255,255,0.06); overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #4fd1c5, #7be7dd); transition: width 0.4s ease; }
        .bar-fill.fail { background: linear-gradient(90deg, #ff6464, #ff9494); }
        .bar-label { color: #9db0c7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bar-value { color: #cfe0f6; text-align: right; }

        /* Analytics donut */
        .donut-wrap { display: flex; align-items: center; gap: 16px; }
        .donut-legend { display: grid; gap: 6px; font-size: 0.8rem; }
        .legend-row { display: flex; align-items: center; gap: 6px; }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        /* Docs */
        .docs { display: grid; gap: 14px; font-size: 0.82rem; line-height: 1.65; color: #cfe0f6; }
        .docs h4 { margin: 0 0 4px; font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #9db0c7; }
        .docs code { font-family: monospace; background: rgba(79,209,197,0.1); color: #4fd1c5; padding: 1px 5px; border-radius: 4px; font-size: 0.8rem; }
        .docs pre { background: rgba(6,16,26,0.8); border-radius: 10px; padding: 10px; font-size: 0.76rem; overflow: auto; color: #cfe0f6; margin: 0; }

        /* Misc */
        .event-list { display: grid; gap: 6px; max-height: 280px; overflow: auto; }
        .event { padding: 7px 10px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); font-size: 0.8rem; }
        pre { margin: 0; padding: 10px; border-radius: 10px; background: rgba(6,16,26,0.75); overflow: auto; font-size: 0.76rem; }
        table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        th, td { text-align: left; padding: 7px 6px; border-bottom: 1px solid rgba(255,255,255,0.07); vertical-align: top; }
        th { color: #9db0c7; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .toast { position: fixed; bottom: 20px; right: 20px; padding: 10px 14px; border-radius: 12px; background: rgba(6,16,26,0.95); border: 1px solid rgba(79,209,197,0.35); z-index: 9999; font-size: 0.86rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .sidebar-bar { display: flex; flex-direction: column; gap: 0; width: 44px; }
        .sidebar-btn { writing-mode: vertical-rl; text-orientation: mixed; padding: 16px 8px; cursor: pointer; color: #9db0c7; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; transition: color 0.12s; }
        .sidebar-btn:hover { color: #edf4ff; }
        @media (max-width: 1200px) { .runner-layout { grid-template-columns: 1fr; } .right-col { display: none; } }
        @media (max-width: 860px) { .hero { grid-template-columns: 1fr; } .stats { grid-template-columns: 1fr; } }

        /* Monitor View */
        .monitor-pane { display: grid; gap: 20px; }
        .monitor-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
        .monitor-grid { display: grid; gap: 16px; margin-top: 10px; }
        .event-log { background: rgba(6,16,26,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; min-height: 400px; display: flex; flex-direction: column; }
        .log-header { padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; }
        .log-list { flex: 1; overflow-y: auto; max-height: 600px; padding: 10px; }
        .log-item { 
            padding: 12px 16px; border-radius: 10px; margin-bottom: 6px; cursor: pointer;
            transition: background 0.12s; border: 1px solid transparent; display: grid; gap: 4px;
        }
        .log-item:hover { background: rgba(255,255,255,0.04); }
        .log-item.active { background: rgba(79,209,197,0.08); border-color: rgba(79,209,197,0.25); }
        .log-item-meta { display: flex; gap: 10px; font-size: 0.72rem; color: #9db0c7; align-items: center; }
        .log-item-title { font-weight: 700; font-size: 0.86rem; color: #edf4ff; display: flex; align-items: center; gap: 8px; }
        .log-detail { 
            margin: 10px 0; padding: 16px; background: #040c16; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
            font-family: 'SFMono-Regular', Consolas, monospace; font-size: 0.76rem;
        }
        .detail-section { margin-bottom: 14px; }
        .detail-label { font-weight: 800; color: #4fd1c5; text-transform: uppercase; font-size: 0.64rem; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
        .detail-code { color: #d4e3f6; white-space: pre-wrap; word-break: break-all; }
        .method-pill { padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; background: rgba(255,255,255,0.1); color: #edf4ff; }
        .method-pill.GET { color: #4fd1c5; background: rgba(79,209,197,0.12); }
        .method-pill.POST { color: #f6ad55; background: rgba(246,173,85,0.12); }
        .status-pill { font-weight: 800; font-size: 0.74rem; }
        .status-pill.ok { color: #4fd1c5; }
        .status-pill.error { color: #ff6464; }
    `;

    constructor() {
        super();
        const state = JSON.parse(this.dataset.state || '{}');
        this.runnerApiBase = this.dataset.runnerApiBase || '/__mockdeck/api/runner';
        this.runnerBase = this.dataset.runnerBase || '/__mockdeck/runner';
        this.uiBase = this.dataset.uiBase || '/__mockdeck';
        this.state = state;
        this.workflow = state.workflows?.length ? deepClone(state.workflows[0]) : emptyWorkflow();
        this.selectedNodeId = this.workflow.nodes[0]?.id || '';
        this.runState = null;
        this.datasetPreview = [];
        this.toast = '';
        this.dragState = null;
        this.connectorDrag = null;
        this.sidebarCollapsed = false;
        this.dialogNodeId = '';
        this.dialogTab = 'basic';
        this.runHistory = [];
        this.selectedRunId = '';
        this.expandedScenarioKey = '';
        this.libraryDragOver = false;
        this.view = state.view || 'designer';
        this.selectedEventId = '';
    }

    connectedCallback() {
        super.connectedCallback();
        this.boundMove = this.onPointerMove.bind(this);
        this.boundUp = this.onPointerUp.bind(this);
        window.addEventListener('pointermove', this.boundMove);
        window.addEventListener('pointerup', this.boundUp);
    }

    disconnectedCallback() {
        window.removeEventListener('pointermove', this.boundMove);
        window.removeEventListener('pointerup', this.boundUp);
        clearInterval(this.poller);
        super.disconnectedCallback();
    }

    setToast(message) {
        this.toast = message;
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { this.toast = ''; }, 2500);
    }

    get selectedNode() {
        return this.workflow.nodes.find((node) => node.id === this.selectedNodeId) || this.workflow.nodes[0];
    }

    get dialogNode() {
        return this.workflow.nodes.find((node) => node.id === this.dialogNodeId) || null;
    }

    async refreshState() {
        this.state = await api(`${this.runnerApiBase}/state`);
        if (this.workflow.id) {
            const latest = this.state.workflows.find((item) => item.id === this.workflow.id);
            if (latest) this.workflow = deepClone(latest);
        }
    }

    updateWorkflowField(event) {
        const { name, value, type, checked } = event.target;
        if (name.startsWith('globals.')) {
            const key = name.replace('globals.', '');
            this.workflow = {
                ...this.workflow,
                globals: {
                    ...this.workflow.globals,
                    [key]: type === 'checkbox' ? checked : value
                }
            };
            return;
        }
        this.workflow = { ...this.workflow, [name]: value };
    }

    updateGlobalHeaders(event) {
        this.workflow = {
            ...this.workflow,
            globals: {
                ...this.workflow.globals,
                headers: objectFromText(event.target.value)
            }
        };
    }

    addNode() {
        const requestCount = this.workflow.nodes.filter((node) => node.nodeType !== 'start').length;
        const node = emptyNode(requestCount + 1);
        node.x = 340 + requestCount * 280;
        node.y = 160 + (requestCount % 2) * 180;
        this.workflow = { ...this.workflow, nodes: [...this.workflow.nodes, node] };
        this.selectedNodeId = node.id;
        return node;
    }

    removeNode(nodeId) {
        const targetNode = this.workflow.nodes.find((node) => node.id === nodeId);
        if (targetNode?.nodeType === 'start') {
            this.setToast('Start step cannot be deleted.');
            return;
        }
        const nodes = this.workflow.nodes.filter((node) => node.id !== nodeId).map((node) => ({
            ...node,
            dependsOn: node.dependsOn.filter((id) => id !== nodeId),
            mappings: (node.mappings || []).filter((mapping) => mapping.sourceNodeId !== nodeId)
        }));
        const nextNodes = nodes.length ? nodes : [startNode(), emptyNode(1)];
        this.workflow = { ...this.workflow, nodes: nextNodes };
        if (this.selectedNodeId === nodeId) this.selectedNodeId = nextNodes[0]?.id || '';
        if (this.dialogNodeId === nodeId) this.hideNodeDialog();
    }

    updateNode(patch) {
        this.updateNodeById(this.selectedNodeId, patch);
    }

    updateNodeById(nodeId, patch) {
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map((node) => node.id === nodeId ? { ...node, ...patch } : node)
        };
    }

    updateNodeField(event) {
        const { name, value, type, checked } = event.target;
        if (name === 'requestRefItemId') {
            const source = (this.state.collectionRequests || []).find((item) => item.id === value);
            return this.updateNode({
                requestRef: { collectionId: source?.collectionId || '', itemId: value },
                method: source?.method || this.selectedNode.method
            });
        }
        if (name === 'headersText') return this.updateNode({ headers: objectFromText(value) });
        if (name === 'dependsOnText') {
            return this.updateNode({
                dependsOn: value.split(',').map((item) => item.trim()).filter(Boolean)
            });
        }
        if (name === 'mappingsText') {
            try {
                const mappings = JSON.parse(value || '[]');
                return this.updateNode({ mappings });
            } catch (error) {
                return;
            }
        }
        this.updateNode({ [name]: type === 'checkbox' ? checked : value });
    }

    startDrag(event, node) {
        if (event.target.closest('button')) return;
        if (event.target.closest('.node-entry-handle') || event.target.closest('.node-exit-handle')) return;
        this.selectedNodeId = node.id;
        this.dragState = {
            nodeId: node.id,
            startX: event.clientX,
            startY: event.clientY,
            nodeX: node.x,
            nodeY: node.y
        };
    }

    getBoardRect() {
        return this.renderRoot.querySelector('.board')?.getBoundingClientRect() || null;
    }

    getPointerOnBoard(event) {
        const rect = this.getBoardRect();
        if (!rect) {
            connectorLog('getPointerOnBoard: missing board rect');
            return null;
        }
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    getEntryAnchor(node) {
        const { height } = getNodeSize(node);
        return { x: node.x, y: node.y + height / 2 };
    }

    getExitAnchor(node) {
        const { width, height } = getNodeSize(node);
        return { x: node.x + width, y: node.y + height / 2 };
    }

    findDropTargetAt(point, sourceId) {
        if (!point) {
            connectorLog('findDropTargetAt: missing point');
            return null;
        }
        const candidates = this.workflow.nodes.filter((node) => node.id !== sourceId && node.nodeType !== 'start');
        const match = candidates.find((node) => {
            const { width, height } = getNodeSize(node);
            const anchor = this.getEntryAnchor(node);
            const withinAnchor = Math.abs(point.x - anchor.x) <= 22 && Math.abs(point.y - anchor.y) <= 22;
            const withinNodeBody = point.x >= node.x && point.x <= node.x + width && point.y >= node.y && point.y <= node.y + height;
            return withinAnchor || withinNodeBody;
        }) || null;
        connectorLog('findDropTargetAt', { point, sourceId, match: match?.id || null });
        return match;
    }

    onPointerMove(event) {
        if (this.dragState) {
            const deltaX = event.clientX - this.dragState.startX;
            const deltaY = event.clientY - this.dragState.startY;
            this.workflow = {
                ...this.workflow,
                nodes: this.workflow.nodes.map((node) => node.id === this.dragState.nodeId ? {
                    ...node,
                    x: Math.max(20, this.dragState.nodeX + deltaX),
                    y: Math.max(20, this.dragState.nodeY + deltaY)
                } : node)
            };
        }
        if (this.connectorDrag) {
            const point = this.getPointerOnBoard(event);
            if (!point) return;
            const targetNode = this.findDropTargetAt(point, this.connectorDrag.sourceId);
            this.connectorDrag = {
                ...this.connectorDrag,
                x2: point.x,
                y2: point.y,
                hoverTargetId: targetNode?.id || ''
            };
            connectorLog('pointermove', {
                sourceId: this.connectorDrag.sourceId,
                point,
                hoverTargetId: targetNode?.id || null
            });
        }
    }

    onPointerUp(event) {
        this.dragState = null;
        if (this.connectorDrag) {
            const point = this.getPointerOnBoard(event);
            const targetNode = this.findDropTargetAt(point, this.connectorDrag.sourceId);
            connectorLog('pointerup', {
                sourceId: this.connectorDrag.sourceId,
                point,
                targetNodeId: targetNode?.id || null
            });
            if (targetNode?.id) {
                this.connectNodes(this.connectorDrag.sourceId, targetNode.id);
                this.setToast('Connection created.');
                return;
            }
            connectorLog('pointerup: no valid target, clearing drag');
            this.connectorDrag = null;
        }
    }

    startConnectorDrag(event, nodeId) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget?.setPointerCapture?.(event.pointerId);
        const sourceNode = this.workflow.nodes.find((node) => node.id === nodeId);
        if (!sourceNode) {
            connectorLog('startConnectorDrag: source node not found', nodeId);
            return;
        }
        const anchor = this.getExitAnchor(sourceNode);
        this.connectorDrag = {
            sourceId: nodeId,
            x1: anchor.x,
            y1: anchor.y,
            x2: anchor.x,
            y2: anchor.y,
            hoverTargetId: ''
        };
        connectorLog('startConnectorDrag', {
            sourceId: nodeId,
            nodeType: sourceNode.nodeType,
            anchor
        });
    }

    connectNodes(sourceId, targetId) {
        if (!sourceId || !targetId || sourceId === targetId) {
            connectorLog('connectNodes: invalid request', { sourceId, targetId });
            return;
        }
        connectorLog('connectNodes: creating link', { sourceId, targetId });
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map((node) => node.id === targetId
                ? { ...node, dependsOn: Array.from(new Set([...(node.dependsOn || []), sourceId])) }
                : node)
        };
        this.connectorDrag = null;
    }

    removeDependency(targetId, sourceId) {
        connectorLog('removeDependency', { sourceId, targetId });
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map((node) => node.id === targetId
                ? { ...node, dependsOn: (node.dependsOn || []).filter((id) => id !== sourceId) }
                : node)
        };
    }

    openNodePopup(node) {
        this.dialogNodeId = node.id;
        this.selectedNodeId = node.id;
        this.updateComplete.then(() => {
            this.renderRoot.querySelector('#node-dialog')?.showModal();
        });
    }

    hideNodeDialog() {
        this.renderRoot.querySelector('#node-dialog')?.close();
    }

    closeNodeDialog() {
        this.dialogNodeId = '';
    }

    async saveWorkflow() {
        const response = await api(`${this.runnerApiBase}/workflows`, {
            method: 'POST',
            body: JSON.stringify(this.workflow)
        });
        this.workflow = deepClone(response.workflow);
        this.selectedNodeId = this.workflow.nodes[0]?.id || '';
        await this.refreshState();
        this.setToast('Workflow saved.');
    }

    async deleteWorkflow(id) {
        await api(`${this.runnerApiBase}/workflows/${id}`, { method: 'DELETE' });
        await this.refreshState();
        this.workflow = this.state.workflows?.length ? deepClone(this.state.workflows[0]) : emptyWorkflow();
        this.selectedNodeId = this.workflow.nodes[0]?.id || '';
        this.setToast('Workflow deleted.');
    }

    async uploadDataset(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const base64 = await fileToBase64(file);
        const response = await api(`${this.runnerApiBase}/datasets`, {
            method: 'POST',
            body: JSON.stringify({
                fileName: file.name,
                name: file.name.replace(/\.[^.]+$/, ''),
                base64
            })
        });
        this.datasetPreview = response.preview || [];
        await this.refreshState();
        this.workflow = {
            ...this.workflow,
            datasetId: response.dataset.id
        };
        this.setToast('Dataset uploaded.');
    }

    async deleteDataset(id) {
        await api(`${this.runnerApiBase}/datasets/${id}`, { method: 'DELETE' });
        await this.refreshState();
        if (this.workflow.datasetId === id) this.workflow = { ...this.workflow, datasetId: '' };
        this.setToast('Dataset deleted.');
    }

    async runWorkflow() {
        await this.saveWorkflow();
        const response = await api(`${this.runnerApiBase}/runs`, {
            method: 'POST',
            body: JSON.stringify({ workflowId: this.workflow.id })
        });
        this.runState = response.run;
        this.selectedRunId = response.run.id;
        this.view = 'monitor';
        this.startPollingRun(response.run.id);
        this.setToast('Run started.');
    }

    startPollingRun(runId) {
        clearInterval(this.poller);
        this.poller = setInterval(async () => {
            const response = await api(`${this.runnerApiBase}/runs/${runId}`);
            this.runState = response.run;
            if (response.run.status !== 'running') {
                clearInterval(this.poller);
                if (!this.runHistory.find(r => r.id === response.run.id)) {
                    this.runHistory = [response.run, ...this.runHistory].slice(0, 20);
                    this.selectedRunId = response.run.id;
                }
            }
        }, 1000);
    }

    addNodeFromRequest(request, dropX = null, dropY = null) {
        const requestCount = this.workflow.nodes.filter((node) => node.nodeType !== 'start').length;
        const node = emptyNode(requestCount + 1);
        node.x = dropX !== null ? dropX : 340 + requestCount * 220;
        node.y = dropY !== null ? dropY : 160 + (requestCount % 3) * 140;
        node.name = request.name;
        node.method = request.method || 'GET';
        node.url = request.url || '';
        node.mockId = request.mockId || '';
        node.headers = deepClone(request.headers || {});
        node.bodyType = request.bodyType || 'raw';
        node.body = request.body || '';
        node.formData = deepClone(request.formData || []);
        node.fileData = request.fileData;
        node.fileName = request.fileName;
        node.requestRef = { collectionId: request.collectionId || '', itemId: request.id || '' };
        this.workflow = { ...this.workflow, nodes: [...this.workflow.nodes, node] };
        this.openNodePopup(node);
    }

    // Drag-drop from library onto canvas
    onLibraryDragStart(event, request) {
        event.dataTransfer.setData('application/json', JSON.stringify(request));
        event.dataTransfer.effectAllowed = 'copy';
    }

    onCanvasDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        this.libraryDragOver = true;
    }

    onCanvasDragLeave() {
        this.libraryDragOver = false;
    }

    onCanvasDrop(event) {
        event.preventDefault();
        this.libraryDragOver = false;
        const raw = event.dataTransfer.getData('application/json');
        if (!raw) return;
        const request = JSON.parse(raw);
        const rect = this.renderRoot.querySelector('.board')?.getBoundingClientRect();
        const x = rect ? Math.max(20, event.clientX - rect.left - 88) : 200;
        const y = rect ? Math.max(20, event.clientY - rect.top - 45) : 160;
        this.addNodeFromRequest(request, x, y);
    }

    // Run history helpers
    _getNodeStatus(nodeId) {
        if (!this.runState) return 'idle';
        const events = this.runState.events || [];
        const nodeEvents = events.filter((e) => e.nodeId === nodeId && e.kind === 'node-complete');
        if (!nodeEvents.length) {
            const running = events.find((e) => e.nodeId === nodeId && e.kind === 'node-start');
            return running ? 'running' : 'idle';
        }
        return nodeEvents.some((e) => !e.ok) ? 'error' : 'done';
    }

    _getStatusClass(status) {
        if (status === 'running') return 'status-running';
        if (status === 'done' || status === 'completed') return 'status-done';
        if (status === 'failed' || status === 'error') return 'status-error';
        return 'status-running';
    }

    renderTraceDetails(event) {
        const tab = this.selectedTraceTab || 'request';
        const isRequest = tab === 'request';
        const data = isRequest ? event.request : event.response;
        if (!data) return html`<div class="trace-panel">Trace data unavailable.</div>`;

        return html`
            <div class="trace-panel" @click=${(e) => e.stopPropagation()}>
                <div class="trace-tabs">
                    <div class=${`trace-tab ${tab === 'request' ? 'active' : ''}`} @click=${() => this.selectedTraceTab = 'request'}>Request</div>
                    <div class=${`trace-tab ${tab === 'response' ? 'active' : ''}`} @click=${() => this.selectedTraceTab = 'response'}>Response</div>
                </div>

                ${isRequest ? html`
                    <div class="trace-section">
                        <span class="trace-label">Target URL</span>
                        <div class="trace-value">${event.method} ${data.url}</div>
                    </div>
                ` : html`
                    <div class="trace-section">
                        <span class="trace-label">Status</span>
                        <div class="trace-value">
                            <span class="node-event-status">${data.statusCode}</span> ${event.ok ? 'Success' : 'Error'}
                        </div>
                    </div>
                `}

                <div class="trace-section">
                    <span class="trace-label">Headers</span>
                    <div class="trace-pre">${Object.entries(data.headers || {}).map(([k,v]) => html`${k}: ${v}\n`)}</div>
                </div>

                ${data.body ? html`
                    <div class="trace-section">
                        <span class="trace-label">Body</span>
                        <div class="trace-pre">${typeof data.body === 'object' ? JSON.stringify(data.body, null, 2) : data.body}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    _getDonutPath(pct, r = 30) {
        const circumference = 2 * Math.PI * r;
        const dash = circumference * pct;
        const gap = circumference - dash;
        return `${Math.round(dash)} ${Math.round(gap)}`;
    }

    renderLibraryRequest(request) {
        return html`
            <div
                class="lib-item"
                draggable="true"
                @dragstart=${(e) => this.onLibraryDragStart(e, request)}>
                <span class=${`lib-kind lib-${request.kind || 'real'}`}>${request.kind || 'real'}</span>
                <div class="label-group" style="flex:1; display:grid;">
                    <div class="lib-name">${request.name}</div>
                    <div class="lib-col">${request.method || 'GET'} • ${request.collectionName || 'Saved API'}</div>
                </div>
            </div>
        `;
    }

    renderLinks() {
        const nodeMap = new Map(this.workflow.nodes.map((node) => [node.id, node]));
        const links = this.workflow.nodes.flatMap((node) => (node.dependsOn || []).map((dependencyId) => {
            const dependency = nodeMap.get(dependencyId);
            if (!dependency) return null;
            const { x: x1, y: y1 } = this.getExitAnchor(dependency);
            const { x: x2, y: y2 } = this.getEntryAnchor(node);
            const midX = (x1 + x2) / 2;
            return svg`
                <path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" fill="none" stroke="rgba(79,209,197,0.12)" stroke-width="12" stroke-linecap="round"></path>
                <path class="edge-core" d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" fill="none" stroke="rgba(79,209,197,0.96)" stroke-width="3.5" stroke-linecap="round" marker-end="url(#arrowhead)"></path>
                <circle class="edge-delete" cx=${midX} cy=${(y1 + y2) / 2} r="10" @click=${() => this.removeDependency(node.id, dependencyId)}></circle>
                <text class="edge-delete-text" x=${midX} y=${(y1 + y2) / 2}>×</text>
            `;
        }));
        if (this.connectorDrag) {
            const { x1, y1, x2, y2 } = this.connectorDrag;
            const midX = (x1 + x2) / 2;
            links.push(svg`
                <path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" fill="none" stroke="rgba(246,173,85,0.16)" stroke-width="12" stroke-linecap="round"></path>
                <path class="edge-draft" d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" fill="none" stroke="rgba(246,173,85,0.98)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="10 8" marker-end="url(#arrowhead-warm)"></path>
            `);
        }
        return links;
    }

    renderNodeInspector(node = this.selectedNode) {
        if (!node) return html`<div class="hint">Select a node to edit it.</div>`;
        const tab = this.dialogTab || 'basic';
        return html`
            <div class="dialog-tabs">
                <div class=${`dialog-tab ${tab === 'basic' ? 'active' : ''}`} @click=${{handleEvent:()=>this.dialogTab='basic'}}>Basic</div>
                ${node.nodeType !== 'start' ? html`<div class=${`dialog-tab ${tab === 'request' ? 'active' : ''}`} @click=${{handleEvent:()=>this.dialogTab='request'}}>Request</div>` : ''}
                ${node.nodeType !== 'start' ? html`<div class=${`dialog-tab ${tab === 'mappings' ? 'active' : ''}`} @click=${{handleEvent:()=>this.dialogTab='mappings'}}>Mappings</div>` : ''}
                <div class=${`dialog-tab ${tab === 'scripts' ? 'active' : ''}`} @click=${{handleEvent:()=>this.dialogTab='scripts'}}>Scripts</div>
                <div class=${`dialog-tab ${tab === 'notes' ? 'active' : ''}`} @click=${{handleEvent:()=>this.dialogTab='notes'}}>Notes</div>
            </div>
            
            <div class="dialog-body">
                ${tab === 'basic' ? html`
                    ${node.nodeType === 'start' ? html`<div class="hint">This is the flow entry step. It does not call an API, but you can target your flow dataset here.</div>` : html`<div class="hint">Choose a saved API from collections or configure a custom endpoint.</div>`}
                    <div class="cols">
                        <zero-input label="Step name" name="name" .value=${node.name} @change=${this.updateNodeField}></zero-input>
                        <zero-select label="Saved API source" name="requestRefItemId" .value=${node.requestRef?.itemId || ''} 
                            .options=${[{value:'', label:'Custom URL / manual'}, ...(this.state.collectionRequests || []).map(r=>({value:r.id, label:`${r.collectionName} / ${r.name} (${r.kind})`}))]}
                            @change=${this.updateNodeField}>
                        </zero-select>
                    </div>
                    <div class="cols">
                        <zero-input label="Depends on step IDs" name="dependsOnText" .value=${(node.dependsOn || []).join(', ')} @change=${this.updateNodeField} placeholder="node-1, node-2"></zero-input>
                        <zero-input label="Timeout ms" name="timeoutMs" type="number" .value=${String(node.timeoutMs || 15000)} @change=${this.updateNodeField}></zero-input>
                    </div>
                    ${(node.dependsOn || []).length ? html`<div class="actions" style="margin-top:6px;">${(node.dependsOn || []).map((depId) => html`<zero-button tone="alt" compact @click=${() => this.removeDependency(node.id, depId)}>Remove ${depId}</zero-button>`)}</div>` : ''}
                ` : ''}

                ${tab === 'request' && node.nodeType !== 'start' ? html`
                    <div class="cols">
                        <zero-select label="Method" name="method" .value=${node.method} 
                            .options=${METHODS.map(m=>({value:m}))}
                            @change=${this.updateNodeField}>
                        </zero-select>
                        <zero-input label="URL" name="url" .value=${node.url} @change=${this.updateNodeField} placeholder="http://127.0.0.1:8381/api/users"></zero-input>
                    </div>
                    <zero-select label="Or linked mock endpoint" name="mockId" .value=${node.mockId || ''} 
                        .options=${[{value:'', label:'None'}, ...(this.state.mocks || []).map(m=>({value:m.id, label:`${m.name} (${m.method} ${m.path})`}))]}
                        @change=${this.updateNodeField}>
                    </zero-select>
                    <zero-textarea label="Request headers (key: value)" name="headersText" .value=${textFromObject(node.headers)} @change=${this.updateNodeField} style="min-height:100px;"></zero-textarea>
                    
                    <div class="panel-heading" style="margin-top:16px;">Request Payload</div>
                    <div style="display:flex; gap:12px; margin-bottom:12px;">
                        ${['none', 'raw', 'multipart', 'urlencoded', 'binary'].map(type => html`
                            <label style="display:flex; align-items:center; gap:5px; font-size:0.75rem; color:#9db0c7; cursor:pointer;">
                                <input type="radio" name="bodyType" .checked=${(node.bodyType || 'none') === type} @change=${() => this.updateNodeField({target:{name:'bodyType',value:type}})}>
                                ${type === 'urlencoded' ? 'x-www-form' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </label>
                        `)}
                    </div>

                    ${(node.bodyType === 'raw') ? html`
                        <zero-textarea label="Raw Body (JSON/Text)" name="body" .value=${node.body} @change=${this.updateNodeField} placeholder='{ "key": "value" }' style="min-height:180px;"></zero-textarea>
                    ` : ''}

                    ${(node.bodyType === 'binary') ? html`
                        <div class="panel" style="background:rgba(255,255,255,0.02); border-style:dashed;">
                            <zero-file-picker label="Binary File" .fileName=${node.fileName} .value=${node.fileData} @change=${(e)=>this.updateNodeField({target:{name:'fileData',value:e.detail.value,fileName:e.detail.fileName}})}></zero-file-picker>
                        </div>
                    ` : ''}

                    ${(['multipart', 'urlencoded'].includes(node.bodyType)) ? html`
                        <div class="form-data-grid">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <span class="panel-heading" style="margin:0; font-size:0.65rem;">Key-Value Pairs</span>
                                <zero-button compact tone="alt" @click=${this.addNodeFormDataRow}>+ Add Row</zero-button>
                            </div>
                            <table style="width:100%; border-collapse:collapse; font-size:0.75rem;">
                                <thead>
                                    <tr>
                                        <th style="width:30%;">Key</th>
                                        <th style="width:15%;">Type</th>
                                        <th>Value</th>
                                        <th style="width:40px;"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(node.formData || []).map((row, idx) => html`
                                        <tr>
                                            <td><zero-input .value=${row.key} @change=${(e)=>this.updateNodeFormDataRow(idx, 'key', e.detail.value)} placeholder="Key"></zero-input></td>
                                            <td>
                                                <select style="width:100%; height:32px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#edf4ff; font-size:0.75rem;" 
                                                    @change=${(e)=>this.updateNodeFormDataRow(idx, 'type', e.target.value)}>
                                                    <option value="text" ?selected=${row.type==='text'}>Text</option>
                                                    <option value="file" ?selected=${row.type==='file'}>File</option>
                                                </select>
                                            </td>
                                            <td>
                                                ${row.type === 'file' ? html`
                                                    <zero-file-picker .fileName=${row.fileName} .value=${row.value} @change=${(e)=>this.updateNodeFormDataRow(idx, 'value', e.detail.value, e.detail.fileName)}></zero-file-picker>
                                                ` : html`
                                                    <zero-input .value=${row.value} @change=${(e)=>this.updateNodeFormDataRow(idx, 'value', e.detail.value)} placeholder="Value"></zero-input>
                                                `}
                                            </td>
                                            <td><div style="cursor:pointer; color:#ff6464; text-align:center;" @click=${()=>this.removeNodeFormDataRow(idx)}>✕</div></td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                            ${(node.formData || []).length === 0 ? html`<div class="muted" style="padding:10px; text-align:center;">No fields added.</div>` : ''}
                        </div>
                    ` : ''}
                ` : ''}

                ${tab === 'mappings' && node.nodeType !== 'start' ? html`
                    <div class="hint">Map outputs from previous steps into this request.</div>
                    <zero-textarea label="Mappings JSON" name="mappingsText" .value=${JSON.stringify(node.mappings || [], null, 2)} @change=${this.updateNodeField} placeholder='[{"sourceType":"step","sourceNodeId":"node-1","sourcePath":"response.body.token","targetType":"header","targetKey":"authorization"}]' style="min-height:220px;"></zero-textarea>
                ` : ''}

                ${tab === 'scripts' ? html`
                    <div class="hint">Javascript executed before/after the request. You can mutate the <code>ctx</code> object...</div>
                    <zero-textarea label="Pre-script" name="preScript" .value=${node.preScript || ''} @change=${this.updateNodeField} style="min-height:140px;"></zero-textarea>
                    <zero-textarea label="Post-script" name="postScript" .value=${node.postScript || ''} @change=${this.updateNodeField} style="min-height:140px;"></zero-textarea>
                ` : ''}

                ${tab === 'notes' ? html`
                    <zero-textarea label="Notes & Documentation" name="notes" .value=${node.notes || ''} @change=${this.updateNodeField} placeholder="Describe the purpose of this step..." style="min-height:200px;"></zero-textarea>
                ` : ''}
            </div>
            
            <div class="actions" style="margin-top:16px;">
                ${node.nodeType !== 'start' ? html`<zero-button tone="warn" @click=${() => this.removeNode(node.id)}>Delete step from workflow</zero-button>` : ''}
            </div>
        `;
    }

    renderAnalytics() {
        const run = this.selectedRunId ? this.runHistory.find(r => r.id === this.selectedRunId) || this.runState : this.runState;
        if (!run) return html`<div class="hint">No runs yet. Execute the workflow to capture analytics.</div>`;
        const metrics = run.summary?.nodeMetrics || [];
        const isSelected = (id) => this.selectedRunId === id;
        
        return html`
            <div class="run-list">
                ${this.runHistory.map((item) => html`
                    <div class=${`run-card ${isSelected(item.id) || (!this.selectedRunId && item.id === run.id) ? 'active' : ''}`} @click=${() => { this.selectedRunId = item.id; this.expandedScenarioKey = ''; }}>
                        <div class="run-header">
                            <span class="run-name">${this.workflow.name}</span>
                            <span class=${`status-badge ${this._getStatusClass(item.status)}`}>${item.status}</span>
                        </div>
                        <div class="run-meta">
                            <span>${new Date(item.startedAt).toLocaleTimeString()}</span>
                            <span>${item.progress?.scenariosCompleted || 0} scenarios</span>
                            ${item.summary ? html`<span>${item.summary.avgMs}ms avg</span>` : ''}
                        </div>
                    </div>
                `)}
            </div>
            
            ${run.summary ? html`
                <div class="donut-wrap" style="margin-top:20px; margin-bottom:16px;">
                    <svg width="60" height="60" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(255,100,100,0.8)" stroke-width="6"></circle>
                        <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(79,209,197,0.9)" stroke-width="6"
                                stroke-dasharray=${this._getDonutPath((run.summary.success+0.001) / Math.max(1, run.progress.nodeTotal))} 
                                stroke-linecap="round" transform="rotate(-90 32 32)">
                        </circle>
                    </svg>
                    <div class="donut-legend">
                        <div class="legend-row">
                            <div class="legend-dot" style="background:#4fd1c5;"></div>
                            <span>${run.summary.success} Successful API calls</span>
                        </div>
                        <div class="legend-row">
                            <div class="legend-dot" style="background:#ff6464;"></div>
                            <span>${run.summary.failure} Failed calls</span>
                        </div>
                    </div>
                </div>

                <div class="bar-chart">
                    ${metrics.map(metric => {
                        const pct = Math.max(2, Math.round((metric.requests / Math.max(1, run.progress.nodeTotal)) * 100));
                        return html`
                            <div class="bar-row">
                                <div class="bar-label" title=${metric.nodeName}>${metric.nodeName}</div>
                                <div class="bar-track">
                                    <div class=${`bar-fill ${metric.failure > 0 ? 'fail' : ''}`} style=${`width:${pct}%`}></div>
                                </div>
                                <div class="bar-value">${metric.avgMs}ms</div>
                            </div>
                        `;
                    })}
                </div>
            ` : ''}

            ${run.events?.length ? html`
                <h4 style="margin:20px 0 10px; font-size:0.75rem; color:#9db0c7; text-transform:uppercase; letter-spacing:0.04em;">Scenario Log Drilldown</h4>
                <div class="scenario-list">
                    ${[...new Set(run.events.map(e => e.scenarioKey))].filter(Boolean).map(key => {
                        const isExpanded = this.expandedScenarioKey === key;
                        const scenarioEvents = run.events.filter(e => e.scenarioKey === key);
                        return html`
                            <div class="scenario-row" @click=${() => this.expandedScenarioKey = isExpanded ? '' : key}>
                                <div><strong>Scenario:</strong> ${key} ${isExpanded ? '▾' : '▸'}</div>
                                ${isExpanded ? html`
                                    <div class="event-list" style="margin-top:10px; margin-bottom:8px;" @click=${(e) => e.stopPropagation()}>
                                        ${scenarioEvents.map(e => {
                                            const isSelected = this.selectedEventId === e.nodeId + e.scenarioKey; // Unique ID for event
                                            return html`
                                                <div class=${`node-event ${e.ok ? 'ok' : 'fail'} ${isSelected ? 'active' : ''}`} 
                                                     @click=${() => {
                                                         this.selectedEventId = isSelected ? '' : (e.nodeId + e.scenarioKey);
                                                         if (!this.selectedTraceTab) this.selectedTraceTab = 'request';
                                                     }}>
                                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                                        <strong>${e.nodeName || 'Node'}</strong>
                                                        <span class="node-event-status" style="font-size:0.65rem;">${e.statusCode || 'N/A'}</span>
                                                    </div>
                                                    <div class="node-event-meta">
                                                        <span>${e.kind}</span>
                                                        ${e.durationMs ? html`<span>${e.durationMs}ms</span>` : ''}
                                                    </div>
                                                    ${e.error ? html`<div style="color:#ff6464; margin-top:4px; font-size:0.75rem;">${e.error}</div>` : ''}
                                                    ${isSelected ? this.renderTraceDetails(e) : ''}
                                                </div>
                                            `;
                                        })}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    })}
                </div>
            ` : ''}
        `;
    }

    renderWorkflowSettings() {
        const activeEnvironment = (this.state.environments || []).find((item) => item.id === this.workflow.globals.environmentId) || null;
        return html`
            <div class="cols">
                <zero-input label="Workflow name" name="name" .value=${this.workflow.name} @change=${this.updateWorkflowField}></zero-input>
                <zero-select label="Target Dataset" name="datasetId" .value=${this.workflow.datasetId || ''} 
                    .options=${[{value:'', label:'None (Run 1 iteration)'}, ...(this.state.datasets || []).map(r=>({value:r.id, label:`${r.name} (${r.rowCount} rows)`}))]}
                    @change=${this.updateWorkflowField}>
                </zero-select>
            </div>
            <div class="cols">
                <zero-select label="Active Environment" name="globals.environmentId" .value=${this.workflow.globals.environmentId || ''} 
                    .options=${[{value:'', label:'None'}, ...(this.state.environments || []).map(r=>({value:r.id, label:`${r.collectionName} / ${r.name}${r.isActive ? ' (Default)' : ''}`}))]}
                    @change=${this.updateWorkflowField}>
                </zero-select>
                <zero-input label="Concurrent runners" name="globals.concurrency" type="number" .value=${String(this.workflow.globals.concurrency)} @change=${this.updateWorkflowField}></zero-input>
            </div>
            <div class="cols">
                <zero-input label="Total iterations" name="globals.iterations" type="number" .value=${String(this.workflow.globals.iterations || 1)} @change=${this.updateWorkflowField}></zero-input>
                <zero-input label="Global Timeout ms" name="globals.timeoutMs" type="number" .value=${String(this.workflow.globals.timeoutMs)} @change=${this.updateWorkflowField}></zero-input>
            </div>
            <div class="hint" style="margin-bottom:12px;">
                <strong>Total Estimated Runs:</strong> 
                ${(this.state.datasets?.find(d => d.id === this.workflow.datasetId)?.rowCount || 1) * Math.max(1, parseInt(this.workflow.globals.iterations || 1, 10))} 
                (Iterations × Dataset Rows)
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <input name="globals.stopOnError" type="checkbox" .checked=${Boolean(this.workflow.globals.stopOnError)} @change=${this.updateWorkflowField} style="width:auto; margin:0;" />
                <span style="font-size:0.84rem; color:#cfe0f6;">Stop workflow on first node error</span>
            </div>
            <zero-textarea label="Global headers (Injected into every request)" .value=${textFromObject(this.workflow.globals.headers)} @change=${this.updateGlobalHeaders} placeholder="Authorization: Bearer secret"></zero-textarea>
            ${activeEnvironment ? html`<div class="hint" style="margin-top:8px;">Environment active: ${activeEnvironment.name}. Access it in templates with <code>{{env.base_url}}</code>.</div>` : ''}
        `;
    }

    renderAnalyticsDashboard() {
        const run = this.selectedRunId ? (this.runHistory.find(r => r.id === this.selectedRunId) || this.runState) : this.runState;
        if (!run) return html`<zero-empty-state message="No active run metrics available."></zero-empty-state>`;
        
        const events = run.events || [];
        const successCount = run.summary?.success || 0;
        const failureCount = run.summary?.failure || 0;
        const totalCount = run.progress?.nodeTotal || 0;
        const avgMs = run.summary?.avgMs || 0;
        const progress = totalCount > 0 ? Math.round((run.progress.nodeCompleted / totalCount) * 100) : 0;

        // Sparkline logic
        const maxPts = 50;
        const recentEvents = events.slice(-maxPts);
        const successPts = recentEvents.map((ev, i) => `${(i / (maxPts-1)) * 100},${ev.ok ? 0 : 100}`).join(' ');
        const latencyPts = recentEvents.map((ev, i) => {
            const val = Math.min(100, ((ev.durationMs || 0) / (avgMs * 2 || 200)) * 100);
            return `${(i / (maxPts-1)) * 100},${100 - val}`;
        }).join(' ');

        return html`
            <div class="analytics-overview">
                <div class="panel-heading">Global Overview</div>
                <zero-stat-grid columns="4">
                    <zero-stat-card value=${String(run.status)} label="Status"></zero-stat-card>
                    <zero-stat-card value=${`${progress}%`} label="Progress"></zero-stat-card>
                    <zero-stat-card value=${String(successCount)} label="Success Nodes"></zero-stat-card>
                    <zero-stat-card value=${String(failureCount)} label="Failed Nodes" style="color:#ff6464;"></zero-stat-card>
                </zero-stat-grid>
            </div>
            
            <div class="monitor-grid" style="margin-top:20px;">
                <div class="panel">
                    <div class="panel-heading">Performance Trends</div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                        <div>
                            <div class="hint" style="margin-bottom:8px; font-weight:700;">Success vs Failure (Recent)</div>
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%; height:60px; background:rgba(0,0,0,0.2); border-radius:8px;">
                                <polyline fill="none" stroke="#4fd1c5" stroke-width="2" points=${successPts} />
                            </svg>
                        </div>
                        <div>
                            <div class="hint" style="margin-bottom:8px; font-weight:700;">Latency (Recent)</div>
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%; height:60px; background:rgba(0,0,0,0.2); border-radius:8px;">
                                <polyline fill="none" stroke="#f6ad55" stroke-width="2" points=${latencyPts} />
                            </svg>
                        </div>
                    </div>
                    <zero-stat-grid columns="3" style="margin-top:16px;">
                        <zero-stat-card value=${`${avgMs}ms`} label="Avg Latency"></zero-stat-card>
                        <zero-stat-card value=${run.summary?.throughputPerSec ? `${run.summary.throughputPerSec}/s` : '0/s'} label="Throughput"></zero-stat-card>
                        <zero-stat-card value=${String(run.progress?.scenariosTotal || 0)} label="Total Scenarios"></zero-stat-card>
                    </zero-stat-grid>
                </div>
            </div>
        `;
    }

    renderEventLog() {
        const run = this.selectedRunId ? (this.runHistory.find(r => r.id === this.selectedRunId) || this.runState) : this.runState;
        const events = run?.events || [];
        
        return html`
            <div class="event-log" style="margin-top:20px;">
                <div class="log-header">
                    <h3 style="margin:0; font-size:0.9rem;">Execution Trigger Log</h3>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <zero-badge tone=${run?.status === 'running' ? 'warn' : 'alt'}>${run?.status || 'idle'}</zero-badge>
                        <span style="font-size:0.75rem; color:#9db0c7;">${events.length} events recorded</span>
                    </div>
                </div>
                <div class="log-list">
                    ${events.length === 0 ? html`<div class="hint" style="padding:40px; text-align:center;">Waiting for execution events...</div>` : ''}
                    ${events.slice().reverse().map(event => {
                        const isExpanded = this.selectedEventId === event.id;
                        return html`
                            <div class="log-item ${isExpanded ? 'active' : ''}" @click=${() => this.selectedEventId = isExpanded ? '' : event.id}>
                                <div class="log-item-title">
                                    <span class="method-pill ${event.method}">${event.method || 'EXE'}</span>
                                    <span style="flex:1">${event.nodeName || 'Step'}</span>
                                    <span class="status-pill ${event.ok ? 'ok' : 'error'}">${event.statusCode || (event.ok ? 'OK' : 'ERR')}</span>
                                </div>
                                <div class="log-item-meta">
                                    <span>${new Date(event.at).toLocaleTimeString()}</span>
                                    ${event.durationMs ? html`<span>• ${event.durationMs}ms</span>` : ''}
                                    ${event.scenarioKey ? html`<span>• Scenario: ${event.scenarioKey}</span>` : ''}
                                </div>
                                ${isExpanded ? html`
                                    <div class="log-detail" @click=${(e) => e.stopPropagation()}>
                                        ${event.request ? html`
                                            <div class="detail-section">
                                                <span class="detail-label">Request Details</span>
                                                <div class="detail-code">URL: ${event.request.url}\n\nHeaders:\n${JSON.stringify(event.request.headers, null, 2)}\n\nBody:\n${event.request.body || '(empty)'}</div>
                                            </div>
                                        ` : ''}
                                        ${event.response ? html`
                                            <div class="detail-section">
                                                <span class="detail-label">Response Details</span>
                                                <div class="detail-code">Status: ${event.response.status}\n\nHeaders:\n${JSON.stringify(event.response.headers, null, 2)}\n\nBody:\n${typeof event.response.body === 'object' ? JSON.stringify(event.response.body, null, 2) : event.response.body}</div>
                                            </div>
                                        ` : ''}
                                        ${(event.error || (!event.ok && event.message)) ? html`
                                            <div class="detail-section">
                                                <span class="detail-label" style="color:#ff6464;">Error Trace</span>
                                                <div class="detail-code" style="color:#ff9494;">${event.error || event.message}</div>
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    })}
                </div>
            </div>
        `;
    }

    renderMonitor() {
        return html`
            <div class="monitor-pane">
                <div class="monitor-header">
                    <div class="title" style="flex:1;">
                        <zero-badge>Live Monitoring</zero-badge>
                        <h1>Run: ${this.workflow.name || 'Current Flow'}</h1>
                        <p class="lead">Tracking live triggers, request cycles, and aggregate performance metrics.</p>
                        <div class="actions" style="margin-top:16px;">
                            <zero-button tone="alt" @click=${() => this.view = 'designer'}>← Designer View</zero-button>
                            <zero-button tone="warn" @click=${() => api(`${this.runnerApiBase}/runs/${this.selectedRunId || this.runState?.id}`, { method: 'DELETE' })}>Stop Execution</zero-button>
                        </div>
                    </div>
                </div>

                ${this.renderAnalyticsDashboard()}
                ${this.renderEventLog()}
            </div>
        `;
    }

    renderDesigner() {
        const dialogNode = this.dialogNode;
        const dataset = (this.state.datasets || []).find((item) => item.id === this.workflow.datasetId);
        
        return html`
            <section class="hero" style="margin-bottom: 20px;">
                <div class="title">
                    <zero-badge>Scenario Designer</zero-badge>
                    <h1>${this.workflow.name || 'Untitled Flow'}</h1>
                    <p class="lead">Design visual DAGs for end-to-end testing, parallel execution, and chained mock validation. Connect nodes to define step order.</p>
                    <div class="actions" style="margin-top:14px;">
                        <zero-button tone="alt" href=${this.uiBase}>Dashboard</zero-button>
                        <zero-button tone="alt" @click=${this.saveWorkflow}>Save Design</zero-button>
                        <zero-button @click=${this.runWorkflow}>Launch Runner 🚀</zero-button>
                        <zero-button tone="alt" href="/__mockdeck/docs" target="_blank">Docs 📖</zero-button>
                    </div>
                </div>
                <div class="stats">
                    <zero-stat-card value=${String(this.workflow.nodes.length)} label="Nodes"></zero-stat-card>
                    <zero-stat-card value=${String(this.state.datasets?.length || 0)} label="Datasets"></zero-stat-card>
                    <zero-stat-card value=${String(this.state.workflows?.length || 0)} label="Workflows"></zero-stat-card>
                    <zero-stat-card value=${String(this.runState?.status || 'idle')} label="Engine Status"></zero-stat-card>
                </div>
            </section>

            <section class=${`runner-layout ${this.sidebarCollapsed ? 'sidebar-hidden' : ''}`}>
                <div class="left-col">
                    <div class="panel" style="padding:0; display:flex; flex-direction:column;">
                        <div style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between;">
                            <div class="panel-heading" style="margin:0;">Flow Canvas</div>
                            <zero-button compact tone="alt" @click=${() => { this.sidebarCollapsed = !this.sidebarCollapsed; }}>${this.sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}</zero-button>
                        </div>
                        <div class=${`board-wrap ${this.libraryDragOver ? 'drag-over' : ''}`}
                             @dragover=${this.onCanvasDragOver}
                             @dragleave=${this.onCanvasDragLeave}
                             @drop=${this.onCanvasDrop}>
                            <div class="board">
                                <svg class="links">
                                    <defs>
                                        <marker id="arrowhead" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto" markerUnits="userSpaceOnUse">
                                            <path d="M 0 1 L 12 7 L 0 13 Q 4 7 0 1 Z" fill="rgba(79,209,197,0.96)"></path>
                                        </marker>
                                        <marker id="arrowhead-warm" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto" markerUnits="userSpaceOnUse">
                                            <path d="M 0 1 L 12 7 L 0 13 Q 4 7 0 1 Z" fill="rgba(246,173,85,0.98)"></path>
                                        </marker>
                                    </defs>
                                    ${this.renderLinks()}
                                </svg>
                                ${this.workflow.nodes.map((node) => html`
                                    <div
                                        data-node-id=${node.id}
                                        class=${`node ${node.nodeType === 'start' ? 'start-node' : ''} ${this.selectedNodeId === node.id ? 'selected' : ''} ${this.connectorDrag?.hoverTargetId === node.id ? 'drop-target' : ''}`}
                                        style=${`left:${node.x}px;top:${node.y}px;`}
                                        @mousedown=${(event) => this.startDrag(event, node)}
                                        @dblclick=${(event) => { event.stopPropagation(); this.openNodePopup(node); }}
                                        @click=${() => { this.selectedNodeId = node.id; }}>
                                        
                                        <div class="node-top">
                                            <span class=${`node-method ${node.nodeType === 'start' ? 'start' : ''}`}>${node.nodeType === 'start' ? 'ROOT' : node.method}</span>
                                            <span class="node-name" title=${node.name}>${node.name}</span>
                                        </div>
                                        
                                        <div class="node-hint">
                                            ${node.nodeType === 'start' ? 'Drill from here' : (node.url || node.mockId ? (node.url || 'Mock Linked') : 'Collection API')}
                                        </div>

                                        <div class="node-status">
                                            <div class=${`status-dot ${this._getNodeStatus(node.id)}`}></div>
                                        </div>

                                        ${node.nodeType !== 'start' ? html`<div class="node-entry-handle" data-node-id=${node.id} title="Entry connector"></div>` : ''}
                                        <div class="node-exit-handle" title="Drag to next step" @pointerdown=${(event) => this.startConnectorDrag(event, node.id)}></div>
                                    </div>
                                `)}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="right-col">
                    <zero-section heading="API Library" ?open=${true}>
                        <div class="api-list" style="max-height: 50vh; overflow-y: auto; padding-right: 6px; display: flex; flex-direction: column; gap: 4px;">
                            ${(this.state.collectionRequests || []).map((request) => this.renderLibraryRequest(request))}
                            ${(this.state.mocks || [])
                                .filter((mock) => !(this.state.collectionRequests || []).some((request) => request.mockId === mock.id))
                                .map((mock) => this.renderLibraryRequest({
                                    id: `mock-${mock.id}`,
                                    name: mock.name,
                                    method: mock.method,
                                    kind: mock.type === 'proxy' ? 'proxy' : 'mock',
                                    collectionName: 'Standalone Mocks',
                                    mockId: mock.id,
                                    url: `${window.location.origin}${mock.path}`
                                }))}
                        </div>
                        <div class="actions" style="margin-top:12px;">
                            <zero-button @click=${this.addNode} tone="alt" style="width:100%;">Create Manual Step</zero-button>
                        </div>
                    </zero-section>

                    <zero-section heading="Configuration" ?open=${true}>
                        ${this.renderWorkflowSettings()}
                    </zero-section>

                    <zero-section heading="Run Statistics" ?open=${true}>
                        ${this.renderAnalytics()}
                    </zero-section>

                    <zero-section heading="Data Sources" ?open=${false}>
                        <label style="margin-bottom:10px;">
                            Upload CSV/Excel
                            <input type="file" accept=".csv,.xlsx,.xls" @change=${this.uploadDataset} />
                        </label>
                        ${dataset ? html`<div class="hint" style="margin-bottom:10px;"><strong>Active:</strong> ${dataset.name}</div>` : ''}
                        ${(this.state.datasets || []).length ? html`
                            <table>
                                <thead><tr><th>Name</th><th>Count</th><th>Del</th></tr></thead>
                                <tbody>
                                    ${(this.state.datasets || []).map((item) => html`
                                        <tr>
                                            <td>${item.name}</td>
                                            <td>${item.rowCount}</td>
                                            <td><zero-button tone="warn" compact @click=${() => this.deleteDataset(item.id)}>X</zero-button></td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        ` : html`<div class="hint">No datasets.</div>`}
                    </zero-section>

                    <zero-section heading="Saved Sequences" ?open=${false}>
                        ${(this.state.workflows || []).length ? html`
                            <table>
                                <thead><tr><th>Name</th><th>Nodes</th><th>Action</th></tr></thead>
                                <tbody>
                                    ${(this.state.workflows || []).map((item) => html`
                                        <tr>
                                            <td>${item.name}</td>
                                            <td>${item.nodeCount}</td>
                                            <td style="display:flex;gap:4px;">
                                                <zero-button tone="alt" compact @click=${() => { this.workflow = deepClone(item); this.selectedNodeId = item.nodes?.[0]?.id || ''; }}>Load</zero-button>
                                                <zero-button tone="warn" compact @click=${() => this.deleteWorkflow(item.id)}>Del</zero-button>
                                            </td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        ` : html`<div class="hint">No flows.</div>`}
                    </zero-section>
                </div>
            </section>

            <zero-modal id="node-dialog" heading="Node Properties" .description=${dialogNode ? `Editing: ${dialogNode.name}` : ''} @close=${this.closeNodeDialog}>
                ${dialogNode ? this.renderNodeInspector(dialogNode) : ''}
                ${dialogNode ? html`
                    <div class="dialog-actions" style="margin-top:20px; border-top:1px solid rgba(255,255,255,0.06); padding-top:14px; display:flex; justify-content:flex-end;">
                        <zero-button @click=${this.hideNodeDialog}>OK, Close</zero-button>
                    </div>
                ` : ''}
            </zero-modal>
        `;
    }

    render() {
        return html`
            <div class="shell">
                ${this.view === 'monitor' ? this.renderMonitor() : this.renderDesigner()}
            </div>
            ${this.toast ? html`<div class="toast">${this.toast}</div>` : ''}
        `;
    }
}

customElements.define('mockdeck-runner', MockDeckRunner);
