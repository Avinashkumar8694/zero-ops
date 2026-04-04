import { LitElement, html, css, svg } from 'lit';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

async function api(path, options = {}) {
    const response = await fetch(path, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed with ${response.status}`);
    }
    return response.json();
}

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function emptyNode(index = 1) {
    return {
        id: `node-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`,
        nodeType: 'request',
        name: `Node ${index}`,
        x: 60 + (index - 1) * 220,
        y: 80,
        enabled: true,
        method: 'GET',
        url: '',
        mockId: '',
        requestRef: { collectionId: '', itemId: '' },
        timeoutMs: 15000,
        headers: {},
        body: '',
        dependsOn: [],
        mappings: [],
        useGlobalHeaders: true,
        preScript: 'return {};',
        postScript: 'return {};',
        notes: ''
    };
}

function startNode() {
    return {
        id: `node-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`,
        nodeType: 'start',
        name: 'Start',
        x: 80,
        y: 240,
        enabled: true,
        method: 'GET',
        url: '',
        mockId: '',
        requestRef: { collectionId: '', itemId: '' },
        timeoutMs: 15000,
        headers: {},
        body: '',
        dependsOn: [],
        mappings: [],
        useGlobalHeaders: true,
        preScript: '',
        postScript: '',
        notes: 'Flow starting point'
    };
}

function emptyWorkflow() {
    return {
        id: '',
        name: 'Flow 1',
        description: '',
        datasetId: '',
        globals: {
            headers: {},
            iterations: 1,
            concurrency: 1,
            timeoutMs: 15000,
            stopOnError: false
        },
        nodes: [startNode(), emptyNode(1)]
    };
}

function objectFromText(text) {
    const output = {};
    String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
            const index = line.indexOf(':');
            if (index > 0) output[line.slice(0, index).trim()] = line.slice(index + 1).trim();
        });
    return output;
}

function textFromObject(value) {
    return Object.entries(value || {}).map(([key, val]) => `${key}: ${val}`).join('\n');
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
        reader.readAsDataURL(file);
    });
}

const CONNECTOR_DEBUG = true;

function connectorLog(...args) {
    if (!CONNECTOR_DEBUG) return;
    console.log('[MockDeck Connector]', ...args);
}

class MockDeckRunner extends LitElement {
    static properties = {
        runnerApiBase: { state: true },
        runnerBase: { state: true },
        uiBase: { state: true },
        state: { state: true },
        workflow: { state: true },
        selectedNodeId: { state: true },
        runState: { state: true },
        datasetPreview: { state: true },
        toast: { state: true },
        connectorDrag: { state: true }
    };

    static styles = css`
        :host { display: block; padding: 24px; color: #edf4ff; }
        .shell { max-width: 1620px; margin: 0 auto; display: grid; gap: 20px; }
        .hero {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 20px;
            align-items: start;
        }
        .title {
            padding: 24px;
            border-radius: 26px;
            border: 1px solid rgba(255,255,255,0.08);
            background:
                radial-gradient(circle at top left, rgba(246,173,85,0.18), transparent 34%),
                linear-gradient(135deg, rgba(79,209,197,0.1), rgba(255,255,255,0.03));
            box-shadow: 0 24px 60px rgba(0,0,0,0.24);
        }
        h1 { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.4rem); line-height: 0.95; letter-spacing: -0.04em; }
        .lead { margin: 0; color: #d4e3f6; line-height: 1.65; max-width: 64ch; }
        .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .stat {
            padding: 14px 16px;
            border-radius: 16px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
        }
        .stat strong { display: block; font-size: 1.4rem; }
        .stat span { color: #9db0c7; font-size: 0.9rem; }
        .grid {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(340px, 0.95fr);
            gap: 20px;
            align-items: start;
        }
        .stack { display: grid; gap: 20px; }
        .panel {
            background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            box-shadow: 0 24px 60px rgba(0,0,0,0.28);
            padding: 18px;
        }
        .panel h3 { margin: 0; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .panel p { margin: 6px 0 14px; color: #9db0c7; font-size: 0.92rem; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
        .btn, button {
            border: 0;
            border-radius: 999px;
            padding: 11px 16px;
            cursor: pointer;
            color: #08111a;
            background: #4fd1c5;
            font-weight: 700;
            text-decoration: none;
        }
        .btn.alt, button.alt { color: #edf4ff; background: rgba(255,255,255,0.08); }
        .btn.warn, button.warn { background: #fc8181; }
        label { display: grid; gap: 6px; font-size: 0.92rem; color: #cfe0f6; }
        input, select, textarea {
            width: 100%;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(6, 16, 26, 0.65);
            color: #edf4ff;
            padding: 12px 14px;
        }
        textarea { min-height: 110px; resize: vertical; font-family: "SFMono-Regular", Menlo, monospace; }
        .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .board-wrap {
            position: relative;
            min-height: 700px;
            overflow: auto;
            touch-action: none;
            border-radius: 20px;
            background:
                linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
                linear-gradient(180deg, rgba(6,16,26,0.82), rgba(10,18,28,0.96));
            background-size: 28px 28px, 28px 28px, auto;
            border: 1px solid rgba(255,255,255,0.08);
        }
        .board { position: relative; width: max(100%, 1400px); min-height: 700px; }
        svg.links {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 700px;
            z-index: 1;
            overflow: visible;
            pointer-events: auto;
        }
        .node {
            position: absolute;
            width: 220px;
            padding: 14px;
            border-radius: 18px;
            background: rgba(12, 23, 34, 0.95);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 18px 35px rgba(0,0,0,0.22);
            cursor: grab;
            user-select: none;
            z-index: 2;
            touch-action: none;
        }
        .node.selected { border-color: rgba(79,209,197,0.85); box-shadow: 0 20px 45px rgba(79,209,197,0.22); }
        .node.drop-target { border-color: rgba(246,173,85,0.95); box-shadow: 0 0 0 3px rgba(246,173,85,0.15), 0 20px 45px rgba(246,173,85,0.18); }
        .node strong { display: block; font-size: 1rem; margin-bottom: 6px; }
        .node small { color: #9db0c7; display: block; line-height: 1.5; }
        .node-entry-handle,
        .node-exit-handle {
            position: absolute;
            top: calc(50% - 12px);
            width: 28px;
            height: 28px;
            border-radius: 999px;
            border: 2px solid rgba(79,209,197,0.9);
            background: #0f1720;
            color: #7be7dd;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: crosshair;
            font-size: 14px;
            font-weight: 700;
            box-shadow: 0 8px 18px rgba(79,209,197,0.18);
            touch-action: none;
        }
        .node-entry-handle { left: -14px; }
        .node-exit-handle { right: -14px; }
        .node.start-node {
            border-color: rgba(246,173,85,0.75);
            background: rgba(36, 26, 10, 0.92);
        }
        .node.start-node .pill {
            background: rgba(246,173,85,0.18);
            color: #ffd591;
        }
        .pill {
            display: inline-flex;
            align-items: center;
            padding: 4px 9px;
            border-radius: 999px;
            font-size: 0.78rem;
            background: rgba(79,209,197,0.14);
            color: #7be7dd;
            margin-bottom: 8px;
        }
        .hint { color: #9db0c7; font-size: 0.88rem; }
        .edge-delete {
            pointer-events: all;
            cursor: pointer;
            fill: rgba(252,129,129,0.95);
            stroke: rgba(15,23,32,0.95);
            stroke-width: 2;
        }
        .edge-delete-text {
            pointer-events: none;
            fill: white;
            font-size: 12px;
            font-family: sans-serif;
            text-anchor: middle;
            dominant-baseline: central;
        }
        .edge-core {
            filter: drop-shadow(0 0 10px rgba(79,209,197,0.22));
        }
        .edge-draft {
            filter: drop-shadow(0 0 10px rgba(246,173,85,0.22));
        }
        table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
        th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); vertical-align: top; }
        pre {
            margin: 0;
            padding: 14px;
            border-radius: 14px;
            background: rgba(6, 16, 26, 0.75);
            overflow: auto;
            font-size: 0.86rem;
        }
        .event-list { display: grid; gap: 8px; max-height: 320px; overflow: auto; }
        .event {
            padding: 10px 12px;
            border-radius: 14px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
        }
        .toast {
            position: sticky;
            bottom: 18px;
            margin-left: auto;
            padding: 12px 16px;
            border-radius: 14px;
            background: rgba(6,16,26,0.92);
            border: 1px solid rgba(79,209,197,0.35);
            width: fit-content;
        }
        @media (max-width: 1180px) { .hero, .grid { grid-template-columns: 1fr; } }
        @media (max-width: 760px) { :host { padding: 16px; } .cols, .stats { grid-template-columns: 1fr; } }
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
    }

    connectedCallback() {
        super.connectedCallback();
        this.boundMove = this.onPointerMove.bind(this);
        this.boundUp = this.onPointerUp.bind(this);
        this.boundMessage = this.onPopupMessage.bind(this);
        window.addEventListener('pointermove', this.boundMove);
        window.addEventListener('pointerup', this.boundUp);
        window.addEventListener('message', this.boundMessage);
    }

    disconnectedCallback() {
        window.removeEventListener('pointermove', this.boundMove);
        window.removeEventListener('pointerup', this.boundUp);
        window.removeEventListener('message', this.boundMessage);
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
        node.x = 320 + requestCount * 240;
        node.y = 240;
        this.workflow = { ...this.workflow, nodes: [...this.workflow.nodes, node] };
        this.selectedNodeId = node.id;
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
        this.selectedNodeId = this.workflow.nodes[0].id;
    }

    updateNode(patch) {
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map((node) => node.id === this.selectedNodeId ? { ...node, ...patch } : node)
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
        return { x: node.x - 12, y: node.y + 60 };
    }

    getExitAnchor(node) {
        return { x: node.x + 232, y: node.y + 60 };
    }

    findDropTargetAt(point, sourceId) {
        if (!point) {
            connectorLog('findDropTargetAt: missing point');
            return null;
        }
        const candidates = this.workflow.nodes.filter((node) => node.id !== sourceId && node.nodeType !== 'start');
        const match = candidates.find((node) => {
            const anchor = this.getEntryAnchor(node);
            const withinAnchor = Math.abs(point.x - anchor.x) <= 22 && Math.abs(point.y - anchor.y) <= 22;
            const withinNodeBody = point.x >= node.x && point.x <= node.x + 220 && point.y >= node.y && point.y <= node.y + 120;
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

    onPopupMessage(event) {
        const payload = event.data;
        if (!payload || payload.type !== 'mockdeck-node-update') return;
        this.workflow = {
            ...this.workflow,
            nodes: this.workflow.nodes.map((node) => node.id === payload.nodeId ? { ...node, ...payload.patch } : node)
        };
        this.selectedNodeId = payload.nodeId;
        this.setToast('Node properties updated from popup.');
    }

    openNodePopup(node) {
        const popup = window.open('', `mockdeck-node-${node.id}`, 'popup=yes,width=780,height=860,resizable=yes,scrollbars=yes');
        if (!popup) {
            this.setToast('Popup was blocked by the browser.');
            return;
        }
        const escapedNode = JSON.stringify({
            ...node,
            headersText: textFromObject(node.headers),
            dependsOnText: (node.dependsOn || []).join(', '),
            mappingsText: JSON.stringify(node.mappings || [], null, 2)
        }).replace(/</g, '\\u003c');
        popup.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Step Properties Popup</title>
<style>
body{margin:0;padding:18px;background:#0f1720;color:#edf4ff;font-family:Segoe UI,sans-serif}
h1{margin:0 0 14px;font-size:20px}
form{display:grid;gap:12px}
label{display:grid;gap:6px;font-size:14px;color:#cfe0f6}
input,select,textarea{width:100%;box-sizing:border-box;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#102033;color:#edf4ff;padding:10px 12px;font:inherit}
textarea{min-height:100px;resize:vertical;font-family:Menlo,monospace}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
button{border:0;border-radius:999px;padding:10px 14px;background:#4fd1c5;color:#08111a;font-weight:700;cursor:pointer}
</style>
</head>
<body>
<h1>Step Properties Popup</h1>
<form id="node-form">
<div class="cols">
<label>Name<input name="name" /></label>
<label>Method<select name="method"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></label>
</div>
<label>URL<input name="url" /></label>
<div class="cols">
<label>Linked mock<input name="mockId" /></label>
<label>Timeout ms<input name="timeoutMs" type="number" /></label>
</div>
<label>Depends on node IDs<input name="dependsOnText" /></label>
<label>Headers<textarea name="headersText"></textarea></label>
<label>Body<textarea name="body"></textarea></label>
<label>Mappings JSON<textarea name="mappingsText"></textarea></label>
<label>Pre-script<textarea name="preScript"></textarea></label>
<label>Post-script<textarea name="postScript"></textarea></label>
<label>Notes<textarea name="notes"></textarea></label>
<button type="submit">Save Properties</button>
</form>
<script>
const node = ${escapedNode};
const form = document.getElementById('node-form');
for (const [key, value] of Object.entries(node)) {
  const el = form.elements.namedItem(key);
  if (el) el.value = value ?? '';
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const patch = {
    name: form.name.value,
    method: form.method.value,
    url: form.url.value,
    mockId: form.mockId.value,
    timeoutMs: Number(form.timeoutMs.value || 15000),
    dependsOn: form.dependsOnText.value.split(',').map(item => item.trim()).filter(Boolean),
    headers: Object.fromEntries(form.headersText.value.split('\\n').map(line => line.trim()).filter(Boolean).map(line => {
      const idx = line.indexOf(':');
      return idx > 0 ? [line.slice(0, idx).trim().toLowerCase(), line.slice(idx + 1).trim()] : null;
    }).filter(Boolean)),
    body: form.body.value,
    mappings: JSON.parse(form.mappingsText.value || '[]'),
    preScript: form.preScript.value,
    postScript: form.postScript.value,
    notes: form.notes.value
  };
  window.opener.postMessage({ type: 'mockdeck-node-update', nodeId: node.id, patch }, '*');
  window.close();
});
</script>
</body>
</html>`);
        popup.document.close();
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
        this.startPollingRun(response.run.id);
        this.setToast('Run started.');
    }

    startPollingRun(runId) {
        clearInterval(this.poller);
        this.poller = setInterval(async () => {
            const response = await api(`${this.runnerApiBase}/runs/${runId}`);
            this.runState = response.run;
            if (response.run.status !== 'running') clearInterval(this.poller);
        }, 1000);
    }

    renderLinks() {
        const nodeMap = new Map(this.workflow.nodes.map((node) => [node.id, node]));
        const links = this.workflow.nodes.flatMap((node) => (node.dependsOn || []).map((dependencyId) => {
            const dependency = nodeMap.get(dependencyId);
            if (!dependency) return null;
            const x1 = dependency.x + 232;
            const y1 = dependency.y + 60;
            const x2 = node.x - 12;
            const y2 = node.y + 60;
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

    renderNodeInspector() {
        const node = this.selectedNode;
        if (!node) return html`<div class="hint">Select a node to edit it.</div>`;
        return html`
            ${node.nodeType === 'start' ? html`<div class="hint">Start step only defines where the flow begins. Connect its exit point to the first executable step.</div>` : ''}
            <div class="cols">
                <label>
                    Name
                    <input name="name" .value=${node.name} @input=${this.updateNodeField} />
                </label>
                <label>
                    Source request
                    <select name="requestRefItemId" .value=${node.requestRef?.itemId || ''} @change=${this.updateNodeField}>
                        <option value="">Custom URL / manual</option>
                        ${(this.state.collectionRequests || []).map((request) => html`<option value=${request.id}>${request.collectionName} / ${request.name} (${request.kind})</option>`)}
                    </select>
                </label>
            </div>
            ${node.nodeType !== 'start' ? html`<div class="cols">
                <label>
                    Method
                    <select name="method" .value=${node.method} @change=${this.updateNodeField}>
                        ${METHODS.map((method) => html`<option value=${method}>${method}</option>`)}
                    </select>
                </label>
                <label>
                    URL
                    <input name="url" .value=${node.url} @input=${this.updateNodeField} placeholder="http://127.0.0.1:8381/api/users" />
                </label>
            </div>
            <div class="cols">
                <label>
                    Or linked mock
                    <select name="mockId" .value=${node.mockId || ''} @change=${this.updateNodeField}>
                        <option value="">None</option>
                        ${(this.state.mocks || []).map((mock) => html`<option value=${mock.id}>${mock.name} (${mock.method} ${mock.path})</option>`)}
                    </select>
                </label>
            </div>` : ''}
            <div class="cols">
                <label>
                    Depends on node IDs
                    <input name="dependsOnText" .value=${(node.dependsOn || []).join(', ')} @input=${this.updateNodeField} placeholder="node-a, node-b" />
                </label>
                <label>
                    Timeout ms
                    <input name="timeoutMs" type="number" .value=${String(node.timeoutMs || 15000)} @input=${this.updateNodeField} />
                </label>
            </div>
            ${(node.dependsOn || []).length ? html`<div class="actions">${(node.dependsOn || []).map((depId) => html`<button class="alt" @click=${() => this.removeDependency(node.id, depId)}>Remove ${depId}</button>`)}</div>` : ''}
            ${node.nodeType !== 'start' ? html`<label>
                Request headers
                <textarea name="headersText" .value=${textFromObject(node.headers)} @input=${this.updateNodeField}></textarea>
            </label>
            <label>
                Request body
                <textarea name="body" .value=${node.body || ''} @input=${this.updateNodeField} placeholder='{"userId":"{{row.userId}}"}'></textarea>
            </label>
            <label>
                Mappings JSON
                <textarea name="mappingsText" .value=${JSON.stringify(node.mappings || [], null, 2)} @input=${this.updateNodeField} placeholder='[{"sourceType":"step","sourceNodeId":"node-1","sourcePath":"response.body.token","targetType":"header","targetKey":"authorization"}]'></textarea>
            </label>` : ''}
            <label>
                Pre-script
                <textarea name="preScript" .value=${node.preScript || ''} @input=${this.updateNodeField}></textarea>
            </label>
            <label>
                Post-script
                <textarea name="postScript" .value=${node.postScript || ''} @input=${this.updateNodeField}></textarea>
            </label>
            <label>
                Notes
                <textarea name="notes" .value=${node.notes || ''} @input=${this.updateNodeField}></textarea>
            </label>
            <div class="actions">
                ${node.nodeType !== 'start' ? html`<button class="warn" @click=${() => this.removeNode(node.id)}>Delete node</button>` : ''}
            </div>
        `;
    }

    renderRunSummary() {
        const run = this.runState;
        if (!run) return html`<div class="hint">No run yet. Save the workflow and start a run to see live progress and final analytics.</div>`;
        const progressPercent = run.progress.nodeTotal ? Math.round((run.progress.nodeCompleted / run.progress.nodeTotal) * 100) : 0;
        return html`
            <div class="cols">
                <div class="stat"><strong>${run.status}</strong><span>Run status</span></div>
                <div class="stat"><strong>${progressPercent}%</strong><span>Node progress</span></div>
                <div class="stat"><strong>${run.progress.scenariosCompleted}/${run.progress.scenariosTotal}</strong><span>Scenarios completed</span></div>
                <div class="stat"><strong>${run.progress.nodeCompleted}/${run.progress.nodeTotal}</strong><span>Requests completed</span></div>
            </div>
            ${run.summary ? html`
                <div class="cols" style="margin-top:12px;">
                    <div class="stat"><strong>${run.summary.success}</strong><span>Successful requests</span></div>
                    <div class="stat"><strong>${run.summary.failure}</strong><span>Failed requests</span></div>
                    <div class="stat"><strong>${run.summary.avgMs} ms</strong><span>Average latency</span></div>
                    <div class="stat"><strong>${run.summary.throughputPerSec}/s</strong><span>Throughput</span></div>
                </div>
            ` : ''}
        `;
    }

    render() {
        const selectedNode = this.selectedNode;
        const dataset = (this.state.datasets || []).find((item) => item.id === this.workflow.datasetId);
        return html`
            <div class="shell">
                <section class="hero">
                    <div class="title">
                        <div class="pill">Dedicated runner workspace</div>
                        <h1>MockDeck Runner</h1>
                        <p class="lead">Model end-to-end API scenarios as connected nodes, chain outputs into downstream requests, run datasets from CSV or Excel, attach pre/post scripts, and inspect live plus final analytics from one place.</p>
                        <div class="actions">
                            <a class="btn alt" href=${this.uiBase}>Back to mock manager</a>
                            <button @click=${this.addNode}>Add node</button>
                            <button class="alt" @click=${this.saveWorkflow}>Save workflow</button>
                            <button @click=${this.runWorkflow}>Run workflow</button>
                        </div>
                    </div>
                    <div class="stats">
                        <div class="stat"><strong>${this.workflow.nodes.length}</strong><span>Nodes in current flow</span></div>
                        <div class="stat"><strong>${this.state.collectionRequests?.length || 0}</strong><span>Collection requests available</span></div>
                        <div class="stat"><strong>${this.state.datasets?.length || 0}</strong><span>Uploaded datasets</span></div>
                        <div class="stat"><strong>${this.state.workflows?.length || 0}</strong><span>Saved workflows</span></div>
                        <div class="stat"><strong>${this.runState?.status || 'idle'}</strong><span>Latest run status</span></div>
                    </div>
                </section>

                <section class="grid">
                    <div class="stack">
                        <div class="panel">
                            <h3>Scenario Canvas</h3>
                            <p>Start has only an exit connector. Every other step has a left entry connector and a right exit connector. Drag from an exit point to an entry point to create a connection. Use the small × on a line to delete it.</p>
                            <div class="board-wrap">
                                <div class="board">
                                    <svg class="links" viewBox="0 0 1400 700" preserveAspectRatio="none">
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
                                            @click=${() => {
                                                this.selectedNodeId = node.id;
                                            }}>
                                            <span class="pill">${node.nodeType === 'start' ? 'START' : node.method}</span>
                                            <strong>${node.name}</strong>
                                            <small>${node.nodeType === 'start' ? 'Connect this to the first step in the flow' : (node.requestRef?.itemId ? `Collection request: ${node.requestRef.itemId}` : (node.mockId ? `Linked mock: ${node.mockId}` : (node.url || 'Set a URL or linked mock')))}</small>
                                            <small>${node.dependsOn?.length ? `Depends on: ${node.dependsOn.join(', ')}` : 'Entry node'}</small>
                                            ${node.nodeType !== 'start' ? html`<div class="node-entry-handle" data-node-id=${node.id} title="Entry connector">•</div>` : ''}
                                            <div class="node-exit-handle" title="Drag from exit to entry" @pointerdown=${(event) => this.startConnectorDrag(event, node.id)}>→</div>
                                        </div>
                                    `)}
                                </div>
                            </div>
                        </div>

                        <div class="panel">
                            <h3>Live Analytics</h3>
                            <p>Track scenario progress during execution, then review final aggregated numbers by node and overall throughput.</p>
                            ${this.renderRunSummary()}
                            ${this.runState?.summary?.nodeMetrics?.length ? html`
                                <table style="margin-top:14px;">
                                    <thead>
                                        <tr>
                                            <th>Node</th>
                                            <th>Requests</th>
                                            <th>Success</th>
                                            <th>Failure</th>
                                            <th>Avg</th>
                                            <th>P95</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.runState.summary.nodeMetrics.map((metric) => html`
                                            <tr>
                                                <td>${metric.nodeName}</td>
                                                <td>${metric.requests}</td>
                                                <td>${metric.success}</td>
                                                <td>${metric.failure}</td>
                                                <td>${metric.avgMs} ms</td>
                                                <td>${metric.p95Ms} ms</td>
                                            </tr>
                                        `)}
                                    </tbody>
                                </table>
                            ` : ''}
                            <div class="event-list" style="margin-top:14px;">
                                ${(this.runState?.events || []).slice().reverse().map((event) => html`
                                    <div class="event">
                                        <strong>${event.kind}</strong>
                                        <div>${event.nodeName || event.scenarioKey || ''}</div>
                                        <div class="hint">${event.at}${event.statusCode ? ` • ${event.statusCode}` : ''}${event.durationMs ? ` • ${event.durationMs} ms` : ''}</div>
                                    </div>
                                `)}
                            </div>
                        </div>
                    </div>

                    <div class="stack">
                        <div class="panel">
                            <h3>Workflow Settings</h3>
                            <p>Configure global headers, concurrency, iterations, stop rules, and the dataset bound to the scenario.</p>
                            <div class="cols">
                                <label>
                                    Workflow name
                                    <input name="name" .value=${this.workflow.name} @input=${this.updateWorkflowField} />
                                </label>
                                <label>
                                    Dataset
                                    <select name="datasetId" .value=${this.workflow.datasetId || ''} @change=${this.updateWorkflowField}>
                                        <option value="">None</option>
                                        ${(this.state.datasets || []).map((item) => html`<option value=${item.id}>${item.name} (${item.rowCount} rows)</option>`)}
                                    </select>
                                </label>
                            </div>
                            <label>
                                Description
                                <textarea name="description" .value=${this.workflow.description || ''} @input=${this.updateWorkflowField}></textarea>
                            </label>
                            <div class="cols">
                                <label>
                                    Iterations
                                    <input name="globals.iterations" type="number" .value=${String(this.workflow.globals.iterations)} @input=${this.updateWorkflowField} />
                                </label>
                                <label>
                                    Concurrency
                                    <input name="globals.concurrency" type="number" .value=${String(this.workflow.globals.concurrency)} @input=${this.updateWorkflowField} />
                                </label>
                            </div>
                            <div class="cols">
                                <label>
                                    Timeout ms
                                    <input name="globals.timeoutMs" type="number" .value=${String(this.workflow.globals.timeoutMs)} @input=${this.updateWorkflowField} />
                                </label>
                                <label>
                                    Stop on error
                                    <input name="globals.stopOnError" type="checkbox" .checked=${Boolean(this.workflow.globals.stopOnError)} @change=${this.updateWorkflowField} />
                                </label>
                            </div>
                            <label>
                                Global headers
                                <textarea .value=${textFromObject(this.workflow.globals.headers)} @input=${this.updateGlobalHeaders}></textarea>
                            </label>
                        </div>

                        <div class="panel">
                            <h3>Selected Step Editor</h3>
                            <p>${selectedNode ? `Editing ${selectedNode.name}. Use this as the main editor. Double-clicking a node opens a popup for quick property edits.` : 'Select a node to edit its request details, connections, mappings, and scripts. Double-click a node if you prefer popup editing.'}</p>
                            ${this.renderNodeInspector()}
                        </div>

                        <div class="panel">
                            <h3>Datasets</h3>
                            <p>Upload CSV or Excel files for dynamic scenario rows. Each row becomes a runtime context as <code>row</code>.</p>
                            <label>
                                Upload dataset
                                <input type="file" accept=".csv,.xlsx,.xls" @change=${this.uploadDataset} />
                            </label>
                            ${dataset ? html`<div class="hint" style="margin-top:10px;">Selected dataset: ${dataset.name} (${dataset.rowCount} rows)</div>` : ''}
                            ${(this.state.datasets || []).length ? html`
                                <table style="margin-top:14px;">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Rows</th>
                                            <th>Headers</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(this.state.datasets || []).map((item) => html`
                                            <tr>
                                                <td>${item.name}</td>
                                                <td>${item.rowCount}</td>
                                                <td>${(item.headers || []).join(', ')}</td>
                                                <td><button class="warn" @click=${() => this.deleteDataset(item.id)}>Delete</button></td>
                                            </tr>
                                        `)}
                                    </tbody>
                                </table>
                            ` : html`<div class="hint">No datasets uploaded yet.</div>`}
                            ${this.datasetPreview.length ? html`<pre style="margin-top:14px;">${JSON.stringify(this.datasetPreview, null, 2)}</pre>` : ''}
                        </div>

                        <div class="panel">
                            <h3>Saved Workflows</h3>
                            <p>Switch between workflows or clean up old ones from here.</p>
                            ${(this.state.workflows || []).length ? html`
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Nodes</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(this.state.workflows || []).map((item) => html`
                                            <tr>
                                                <td>${item.name}</td>
                                                <td>${item.nodeCount}</td>
                                                <td>
                                                    <div class="actions">
                                                        <button class="alt" @click=${() => { this.workflow = deepClone(item); this.selectedNodeId = item.nodes?.[0]?.id || ''; }}>Open</button>
                                                        <button class="warn" @click=${() => this.deleteWorkflow(item.id)}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `)}
                                    </tbody>
                                </table>
                            ` : html`<div class="hint">No saved workflows yet.</div>`}
                        </div>

                        <div class="panel">
                            <h3>Collection Requests</h3>
                            <p>Runner nodes can point at real, mock, or proxy requests saved in collections.</p>
                            ${(this.state.collectionRequests || []).length ? html`
                                <table>
                                    <thead><tr><th>Collection</th><th>Name</th><th>Kind</th></tr></thead>
                                    <tbody>
                                        ${(this.state.collectionRequests || []).map((request) => html`
                                            <tr>
                                                <td>${request.collectionName}</td>
                                                <td>${request.name}</td>
                                                <td>${request.kind}</td>
                                            </tr>
                                        `)}
                                    </tbody>
                                </table>
                            ` : html`<div class="hint">No saved collection requests yet.</div>`}
                        </div>
                    </div>
                </section>
            </div>
            ${this.toast ? html`<div class="toast">${this.toast}</div>` : ''}
        `;
    }
}

customElements.define('mockdeck-runner', MockDeckRunner);
