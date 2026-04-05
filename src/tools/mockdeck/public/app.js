import { LitElement, html, css } from 'lit';
import '/lit_component/zero-badge.js';
import '/lit_component/zero-button.js';
import '/lit_component/zero-list-item.js';
import '/lit_component/zero-panel.js';
import '/lit_component/zero-stat-card.js';
import '/lit_component/zero-tree-item.js';
import '/lit_component/zero-context-menu.js';
import '/lit_component/zero-empty-state.js';
import { api } from './shared/http.js';
import { objectFromText, textFromObject, prettyJson, fileToBase64 } from './shared/formatters.js';
import { METHODS, REQUEST_KINDS, emptyCollection, emptyRequest, emptyFolder } from './shared/collection-model.js';

class MockDeckApp extends LitElement {
    static properties = {
        apiBase: { state: true },
        runnerBase: { state: true },
        state: { state: true },
        selectedCollectionId: { state: true },
        selectedItemId: { state: true },
        requestForm: { state: true },
        folderForm: { state: true },
        importText: { state: true },
        trigger: { state: true },
        triggerResult: { state: true },
        toast: { state: true },
        expandedCollections: { state: true },
        expandedFolders: { state: true },
        contextMenu: { state: true }
    };

    static styles = css`
        :host { display: block; padding: 18px; color: #edf4ff; font-family: 'Inter', system-ui, sans-serif; }
        .shell { max-width: 1680px; margin: 0 auto; display: grid; gap: 18px; }
        .hero { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }
        .app-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr) 400px; gap: 0; height: calc(100vh - 220px); min-height: 500px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; background: rgba(255,255,255,0.01); }
        .sidebar { display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.06); overflow: hidden; background: rgba(6,16,26,0.3); }
        .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
        .sidebar-title { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #9db0c7; }
        .sidebar-tree { flex: 1; overflow-y: auto; padding: 6px 6px; }
        .detail-panel { flex: 1; overflow-y: auto; padding: 20px; border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 16px; }
        .console-panel { overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .panel {
            min-width: 0;
            background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            padding: 16px;
        }
        .panel-heading { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #9db0c7; margin: 0 0 12px; }
        .hero-card {
            padding: 22px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08);
            background: radial-gradient(circle at top left, rgba(79,209,197,0.15), transparent 34%), linear-gradient(135deg, rgba(246,173,85,0.12), rgba(255,255,255,0.03));
        }
        h1 { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 0.95; letter-spacing: -0.04em; }
        h2, h3 { margin: 0; font-size: 1rem; letter-spacing: 0.04em; text-transform: uppercase; }
        p { margin: 6px 0 0; color: #9db0c7; line-height: 1.6; }
        .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .stat { padding: 14px 16px; border-radius: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); }
        .stat strong { display: block; font-size: 1.4rem; }
        .stat span { color: #9db0c7; font-size: 0.88rem; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        label { display: grid; gap: 5px; font-size: 0.88rem; color: #cfe0f6; }
        input, select, textarea {
            width: 100%; min-width: 0;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(6, 16, 26, 0.65);
            color: #edf4ff;
            padding: 9px 11px;
            font-size: 0.88rem;
        }
        textarea { min-height: 80px; resize: vertical; font-family: "SFMono-Regular", Menlo, monospace; font-size: 0.82rem; }
        .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .cols3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .muted { color: #9db0c7; font-size: 0.84rem; line-height: 1.5; }
        pre { margin: 0; padding: 12px; border-radius: 12px; background: rgba(6,16,26,0.85); overflow: auto; font-size: 0.82rem; color: #cfe0f6; }
        .kind-chip { display: inline-flex; padding: 3px 9px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; }
        .kind-real  { background: rgba(156,163,175,0.12); color: #9ca3af; }
        .kind-mock  { background: rgba(79,209,197,0.12);  color: #4fd1c5; }
        .kind-proxy { background: rgba(246,173,85,0.12);  color: #f6ad55; }
        .detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
        .detail-title { font-size: 1.1rem; font-weight: 700; line-height: 1.2; }
        .detail-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
        .toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 16px; border-radius: 14px; background: rgba(6,16,26,0.95); border: 1px solid rgba(79,209,197,0.35); z-index: 9999; font-size: 0.88rem; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .env-card { border-radius: 12px; border: 1px solid rgba(255,255,255,0.07); padding: 12px; background: rgba(255,255,255,0.02); display: grid; gap: 10px; }
        .env-active { border-color: rgba(79,209,197,0.3); }
        .section-gap { display: grid; gap: 12px; }
        @media (max-width: 1200px) { .app-layout { grid-template-columns: 260px minmax(0,1fr); } .console-panel { display: none; } }
        @media (max-width: 860px) { .hero { grid-template-columns: 1fr; } .stats { grid-template-columns: 1fr; } .app-layout { grid-template-columns: 1fr; height: auto; } }
    `;

    constructor() {
        super();
        this.apiBase = this.dataset.apiBase || '/__mockdeck/api';
        this.runnerBase = this.dataset.runnerBase || '/__mockdeck/runner';
        this.state = JSON.parse(this.dataset.state || '{}');
        this.selectedCollectionId = this.state.collections?.[0]?.id || '';
        this.selectedItemId = '';
        this.requestForm = emptyRequest();
        this.folderForm = emptyFolder();
        this.importText = '[\n  {\n    "type": "request",\n    "kind": "real",\n    "name": "Users API",\n    "method": "GET",\n    "url": "https://api.example.com/users"\n  }\n]';
        this.trigger = { method: 'GET', url: `${window.location.origin}/api/health`, headersText: '', body: '' };
        this.triggerResult = null;
        this.toast = '';
        this.expandedCollections = new Set(this.state.collections?.length ? [this.state.collections[0]?.id] : []);
        this.expandedFolders = new Set();
        this.contextMenu = { open: false, x: 0, y: 0, items: [], targetId: '' };
    }

    get selectedCollection() {
        return (this.state.collections || []).find((collection) => collection.id === this.selectedCollectionId) || null;
    }

    get selectedItem() {
        return (this.selectedCollection?.items || []).find((item) => item.id === this.selectedItemId) || null;
    }

    get selectedRequestItem() {
        const item = this.selectedItem;
        return item?.type === 'request' ? item : null;
    }

    get selectedCollectionRequests() {
        return (this.selectedCollection?.items || []).filter((item) => item.type === 'request');
    }

    get activeEnvironment() {
        return (this.selectedCollection?.environments || []).find((env) => env.id === this.selectedCollection?.activeEnvironmentId) || null;
    }

    setToast(message) {
        this.toast = message;
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { this.toast = ''; }, 2600);
    }

    async refreshState() {
        this.state = await api(`${this.apiBase}/state`);
        if (!this.selectedCollectionId && this.state.collections?.length) this.selectedCollectionId = this.state.collections[0].id;
    }

    selectCollection(collectionId) {
        this.selectedCollectionId = collectionId;
        this.selectedItemId = '';
        this.requestForm = emptyRequest();
        this.folderForm = emptyFolder();
    }

    selectItem(item) {
        this.selectedItemId = item.id;
        if (item.type === 'folder') {
            this.folderForm = { ...item };
            this.requestForm = null;
            return;
        }
        this.folderForm = null;
        this.requestForm = {
            id: item.id,
            type: item.type,
            kind: item.kind,
            parentId: item.parentId,
            name: item.name,
            description: item.description || '',
            method: item.method || 'GET',
            url: item.url || '',
            headersText: textFromObject(item.headers),
            body: item.body || '',
            mockPath: item.mockConfig?.path || '/api/example',
            mockStatusCode: item.mockConfig?.statusCode || 200,
            mockDelayMs: item.mockConfig?.delayMs || 0,
            mockTemplateBody: item.mockConfig?.templateBody || '{\n  "ok": true\n}',
            proxyTargetUrl: item.mockConfig?.proxyTargetUrl || '',
            responseHeadersText: textFromObject(item.mockConfig?.responseHeaders || {})
        };
    }

    updateCollectionField(event) {
        const { name, value } = event.target;
        const collection = this.selectedCollection || emptyCollection();
        const next = { ...collection, [name]: value };
        this.state = {
            ...this.state,
            collections: (this.state.collections || []).map((item) => item.id === next.id ? next : item)
        };
    }

    addEnvironment() {
        const collection = this.selectedCollection;
        if (!collection) return;
        const environment = {
            id: `env-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`,
            name: `Environment ${(collection.environments || []).length + 1}`,
            variables: {}
        };
        const environments = [...(collection.environments || []), environment];
        const next = {
            ...collection,
            environments,
            activeEnvironmentId: collection.activeEnvironmentId || environment.id
        };
        this.state = {
            ...this.state,
            collections: (this.state.collections || []).map((item) => item.id === collection.id ? next : item)
        };
    }

    updateEnvironmentField(environmentId, field, value) {
        const collection = this.selectedCollection;
        if (!collection) return;
        const next = {
            ...collection,
            environments: (collection.environments || []).map((env) => env.id === environmentId
                ? { ...env, [field]: field === 'variables' ? objectFromText(value) : value }
                : env)
        };
        this.state = {
            ...this.state,
            collections: (this.state.collections || []).map((item) => item.id === collection.id ? next : item)
        };
    }

    activateEnvironment(environmentId) {
        const collection = this.selectedCollection;
        if (!collection) return;
        const next = { ...collection, activeEnvironmentId: environmentId };
        this.state = {
            ...this.state,
            collections: (this.state.collections || []).map((item) => item.id === collection.id ? next : item)
        };
    }

    deleteEnvironment(environmentId) {
        const collection = this.selectedCollection;
        if (!collection) return;
        const environments = (collection.environments || []).filter((env) => env.id !== environmentId);
        const next = {
            ...collection,
            environments,
            activeEnvironmentId: collection.activeEnvironmentId === environmentId ? (environments[0]?.id || '') : collection.activeEnvironmentId
        };
        this.state = {
            ...this.state,
            collections: (this.state.collections || []).map((item) => item.id === collection.id ? next : item)
        };
    }

    getCreateChoices() {
        const parentId = this.selectedItem?.type === 'folder' ? this.selectedItem.id : null;
        return [
            {
                title: 'Folder',
                subtitle: 'Use a folder to group related APIs and keep large collections organized.',
                meta: ['organize', parentId ? 'inside selected folder' : 'root level'],
                action: () => this.newFolder(parentId)
            },
            {
                title: 'Real API',
                subtitle: 'Save a request that calls a real external or internal backend URL.',
                meta: ['calls real backend', 'best for actual integrations'],
                action: () => this.newRequest(parentId, 'real')
            },
            {
                title: 'Mock API',
                subtitle: 'Create a local fake endpoint with a response template you fully control.',
                meta: ['local fake response', 'great for testing without backend'],
                action: () => this.newRequest(parentId, 'mock')
            },
            {
                title: 'Proxy API',
                subtitle: 'Expose a local route that forwards traffic to another URL while keeping one local entry point.',
                meta: ['local route + forward', 'good for hybrid mocking'],
                action: () => this.newRequest(parentId, 'proxy')
            }
        ];
    }

    renderCreateGuide() {
        return html`
            <zero-panel heading="Create New" description="Choose what you want to add. Each option explains when to use it.">
                <div class="workspace-list" style="max-height:none;">
                    ${this.getCreateChoices().map((choice) => html`
                        <zero-list-item
                            .title=${choice.title}
                            .subtitle=${choice.subtitle}
                            .meta=${choice.meta}
                            @click=${choice.action}>
                        </zero-list-item>
                    `)}
                </div>
            </zero-panel>
        `;
    }

    renderDocsGuide() {
        return html`
            <zero-panel heading="How To Use MockDeck" description="Practical reference for collections, environments, request scripting, and runner variables.">
                <div class="workspace-list" style="max-height:none;">
                    <zero-list-item
                        .title=${'1. Collection basics'}
                        .subtitle=${'A collection groups folders, APIs, environments, datasets, and workflows that belong together.'}
                        .meta=${['workspace', 'organize']}>
                    </zero-list-item>
                    <zero-list-item
                        .title=${'2. Folder vs Real API vs Mock API vs Proxy API'}
                        .subtitle=${'Folder organizes. Real API calls a real backend URL. Mock API serves a local fake response. Proxy API exposes a local path and forwards traffic to another URL.'}
                        .meta=${['create guide', 'request types']}>
                    </zero-list-item>
                    <zero-list-item
                        .title=${'3. What is row?'}
                        .subtitle=${'In runner mode, each CSV or Excel row becomes row. Example: row.username or row.userId.'}
                        .meta=${['dataset', 'runner']}>
                    </zero-list-item>
                    <zero-list-item
                        .title=${'4. What is environment?'}
                        .subtitle=${'An environment is a saved key/value set for one collection, such as base_url, tenant, and timeouts. One environment can be active by default.'}
                        .meta=${['environment', 'collection']}>
                    </zero-list-item>
                    <zero-list-item
                        .title=${'5. How to access environment values'}
                        .subtitle=${'Templates can use {{env.base_url}}. Runner scripts can use ctx.environment.variables.base_url.'}
                        .meta=${['templates', 'scripts']}>
                    </zero-list-item>
                    <zero-list-item
                        .title=${'6. What are globals / local variables?'}
                        .subtitle=${'Runner scripts can return vars. Those values become runtime globals for later nodes in the same scenario. Example: accessToken, currentUserId.'}
                        .meta=${['vars', 'state']}>
                    </zero-list-item>
                </div>

                <pre style="margin-top:14px;">${`// Pre-script example: set headers and variables before the request is sent
return {
  headers: {
    "x-tenant": ctx.environment?.variables?.tenant || "demo-local"
  },
  vars: {
    currentUsername: ctx.row.username
  }
};`}</pre>

                <pre style="margin-top:14px;">${`// Post-script example: assert response and store values for later nodes
helpers.assert(ctx.response.statusCode === 200, "Expected HTTP 200");
return {
  vars: {
    accessToken: ctx.response.body.token
  }
};`}</pre>

                <pre style="margin-top:14px;">${`// Common runner objects
ctx.row                     // current dataset row
ctx.environment.variables   // active environment values
ctx.globals                 // variables collected during the scenario
ctx.request                 // request about to be sent (pre-script)
ctx.response                // response received (post-script)
ctx.steps                   // completed upstream nodes`}</pre>

                <div class="muted" style="margin-top:10px;">
                    Guidelines:
                    1. Use environments for reusable base values.
                    2. Use row for dataset-driven values.
                    3. Use pre-script to shape the request.
                    4. Use post-script to assert and store values.
                    5. Use mappings when one node should feed another automatically.
                </div>
            </zero-panel>
        `;
    }

    async createCollection() {
        const response = await api(`${this.apiBase}/collections`, {
            method: 'POST',
            body: JSON.stringify(emptyCollection())
        });
        await this.refreshState();
        this.selectCollection(response.collection.id);
        this.setToast('Collection created.');
    }

    async saveCollection() {
        const collection = this.selectedCollection || emptyCollection();
        const response = await api(`${this.apiBase}/collections`, {
            method: 'POST',
            body: JSON.stringify(collection)
        });
        await this.refreshState();
        this.selectCollection(response.collection.id);
        this.setToast('Collection saved.');
    }

    async deleteCollection() {
        if (!this.selectedCollection || !confirm('Delete this collection and all nested folders/requests?')) return;
        await api(`${this.apiBase}/collections/${this.selectedCollection.id}`, { method: 'DELETE' });
        this.selectedCollectionId = '';
        this.selectedItemId = '';
        await this.refreshState();
        this.setToast('Collection deleted.');
    }

    updateRequestForm(event) {
        const { name, value } = event.target;
        this.requestForm = { ...this.requestForm, [name]: value };
    }

    updateFolderForm(event) {
        const { name, value } = event.target;
        this.folderForm = { ...this.folderForm, [name]: value };
    }

    newFolder(parentId = null) {
        this.selectedItemId = '';
        this.requestForm = null;
        this.folderForm = emptyFolder(parentId);
    }

    newRequest(parentId = null, kind = 'real') {
        this.selectedItemId = '';
        this.folderForm = null;
        this.requestForm = { ...emptyRequest(parentId), kind };
    }

    async saveFolder() {
        if (!this.selectedCollectionId) return;
        await api(`${this.apiBase}/collections/${this.selectedCollectionId}/items`, {
            method: 'POST',
            body: JSON.stringify(this.folderForm)
        });
        await this.refreshState();
        this.setToast('Folder saved.');
    }

    async saveRequest(event) {
        event?.preventDefault?.();
        if (!this.selectedCollectionId) return;
        const payload = {
            id: this.requestForm.id || undefined,
            type: 'request',
            kind: this.requestForm.kind,
            parentId: this.requestForm.parentId || null,
            name: this.requestForm.name,
            description: this.requestForm.description,
            method: this.requestForm.method,
            url: this.requestForm.kind === 'real' ? this.requestForm.url : '',
            headers: objectFromText(this.requestForm.headersText),
            body: this.requestForm.body,
            mockConfig: {
                path: this.requestForm.mockPath,
                statusCode: Number(this.requestForm.mockStatusCode),
                delayMs: Number(this.requestForm.mockDelayMs),
                templateBody: this.requestForm.mockTemplateBody,
                responseHeaders: objectFromText(this.requestForm.responseHeadersText),
                proxyTargetUrl: this.requestForm.proxyTargetUrl
            }
        };
        const response = await api(`${this.apiBase}/collections/${this.selectedCollectionId}/items`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        await this.refreshState();
        this.selectedItemId = response.item.id;
        this.selectItem(response.item);
        this.setToast('Request saved.');
    }

    async deleteItem(itemId) {
        if (!this.selectedCollectionId || !confirm('Delete this item? Nested children will also be removed.')) return;
        await api(`${this.apiBase}/collections/${this.selectedCollectionId}/items/${itemId}`, { method: 'DELETE' });
        await this.refreshState();
        this.selectedItemId = '';
        this.requestForm = emptyRequest();
        this.folderForm = emptyFolder();
        this.setToast('Item deleted.');
    }

    async importItems() {
        if (!this.selectedCollectionId) return;
        const items = JSON.parse(this.importText || '[]');
        await api(`${this.apiBase}/collections/${this.selectedCollectionId}/items/import`, {
            method: 'POST',
            body: JSON.stringify({ items })
        });
        await this.refreshState();
        this.setToast('Items imported.');
    }

    async sendTrigger(event) {
        event.preventDefault();
        this.triggerResult = await api(`${this.apiBase}/trigger`, {
            method: 'POST',
            body: JSON.stringify({
                method: this.trigger.method,
                url: this.trigger.url,
                headers: objectFromText(this.trigger.headersText),
                body: this.trigger.body
            })
        });
    }

    buildRequestUrl(item) {
        if (!item) return '';
        if (item.kind === 'real') return item.url || '';
        const path = item.mockConfig?.path || item.path || '/api/example';
        return `${window.location.origin}${path}`;
    }

    loadTriggerFromRequest(item, shouldSend = false) {
        if (!item || item.type !== 'request') return;
        this.trigger = {
            method: item.method || 'GET',
            url: this.buildRequestUrl(item),
            headersText: textFromObject(item.headers || {}),
            body: item.body || ''
        };
        if (shouldSend) {
            this.triggerResult = null;
            this.updateComplete.then(() => this.sendTrigger({ preventDefault() {} }));
        }
    }

    openCollectionRunner() {
        window.location.href = this.runnerBase;
    }

    // ── Expand/collapse ──────────────────────────────────────────────────
    toggleCollection(collectionId) {
        const next = new Set(this.expandedCollections);
        if (next.has(collectionId)) next.delete(collectionId);
        else next.add(collectionId);
        this.expandedCollections = next;
    }

    toggleFolder(folderId) {
        const next = new Set(this.expandedFolders);
        if (next.has(folderId)) next.delete(folderId);
        else next.add(folderId);
        this.expandedFolders = next;
    }

    // ── Context menu ────────────────────────────────────────────────────
    _closeMenu() {
        this.contextMenu = { ...this.contextMenu, open: false };
    }

    _openMenuForCollection(collection, x, y) {
        this.contextMenu = {
            open: true, x, y,
            items: [
                { label: '➕ New Folder', action: () => this.newFolder(null) },
                { label: '⚡ New Real API', action: () => this.newRequest(null, 'real') },
                { label: '🎭 New Mock API', action: () => this.newRequest(null, 'mock') },
                { label: '🔀 New Proxy API', action: () => this.newRequest(null, 'proxy') },
                { separator: true },
                { label: '▶ Open in Runner', action: () => this.openCollectionRunner() },
                { separator: true },
                { label: 'Delete Collection', danger: true, action: () => this.deleteCollection() }
            ]
        };
    }

    _openMenuForFolder(folder, x, y) {
        this.contextMenu = {
            open: true, x, y,
            items: [
                { label: '➕ New Sub-Folder', action: () => this.newFolder(folder.id) },
                { label: '⚡ New Real API here', action: () => this.newRequest(folder.id, 'real') },
                { label: '🎭 New Mock API here', action: () => this.newRequest(folder.id, 'mock') },
                { label: '🔀 New Proxy API here', action: () => this.newRequest(folder.id, 'proxy') },
                { separator: true },
                { label: 'Delete Folder', danger: true, action: () => this.deleteItem(folder.id) }
            ]
        };
    }

    _openMenuForRequest(item, x, y) {
        this.contextMenu = {
            open: true, x, y,
            items: [
                { label: '▶ Trigger Now', action: () => this.loadTriggerFromRequest(item, true) },
                { label: 'Load into Console', action: () => this.loadTriggerFromRequest(item, false) },
                { separator: true },
                { label: 'Delete API', danger: true, action: () => this.deleteItem(item.id) }
            ]
        };
    }

    _handleMenuSelect(event) {
        event.detail?.action?.();
        this._closeMenu();
    }

    // ── Unified sidebar tree ─────────────────────────────────────────────
    renderItemTree(collectionItems, parentId = null, depth = 0) {
        const items = (collectionItems || [])
            .filter((item) => (item.parentId || null) === parentId)
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        return items.map((item) => {
            const isFolder = item.type === 'folder';
            const children = isFolder
                ? (collectionItems || []).filter((c) => c.parentId === item.id)
                : [];
            const isExpanded = this.expandedFolders.has(item.id);
            return html`
                <zero-tree-item
                    .title=${item.name}
                    .subtitle=${isFolder ? '' : (item.kind === 'real' ? (item.url || item.mockConfig?.path || '') : (item.mockConfig?.path || ''))}
                    .depth=${depth}
                    .itemType=${isFolder ? 'folder' : 'request'}
                    .itemKind=${item.kind || ''}
                    .itemMethod=${item.method || 'GET'}
                    .hasChildren=${isFolder && children.length > 0}
                    .menuItems=${[true]}
                    ?expanded=${isExpanded}
                    ?active=${this.selectedItemId === item.id}
                    @select=${() => { this.selectCollection(this.selectedCollectionId); this.selectItem(item); }}
                    @toggle=${() => this.toggleFolder(item.id)}
                    @menu=${(e) => {
                        this.selectCollection(this.selectedCollectionId);
                        this.selectItem(item);
                        if (isFolder) this._openMenuForFolder(item, e.detail.x, e.detail.y);
                        else this._openMenuForRequest(item, e.detail.x, e.detail.y);
                    }}>
                </zero-tree-item>
                ${isFolder && isExpanded ? this.renderItemTree(collectionItems, item.id, depth + 1) : ''}
            `;
        });
    }

    renderSidebar() {
        const collections = this.state.collections || [];
        return html`
            <div class="sidebar">
                <div class="sidebar-header">
                    <span class="sidebar-title">Collections</span>
                    <zero-button compact @click=${this.createCollection}>+</zero-button>
                </div>
                <div class="sidebar-tree">
                    ${collections.length === 0 ? html`
                        <zero-empty-state
                            icon="📦"
                            heading="No collections"
                            message="Create a collection to get started.">
                        </zero-empty-state>
                    ` : collections.map((collection) => {
                        const isSelected = this.selectedCollectionId === collection.id;
                        const isExpanded = this.expandedCollections.has(collection.id);
                        const reqCount = (collection.items || []).filter((i) => i.type === 'request').length;
                        return html`
                            <zero-tree-item
                                .title=${collection.name}
                                .subtitle=${`${reqCount} API${reqCount !== 1 ? 's' : ''}`}
                                .depth=${0}
                                .itemType=${'collection'}
                                .hasChildren=${(collection.items || []).length > 0}
                                .menuItems=${[true]}
                                ?expanded=${isExpanded}
                                ?active=${isSelected && !this.selectedItemId}
                                @select=${() => { this.selectCollection(collection.id); if (!isExpanded) this.toggleCollection(collection.id); }}
                                @toggle=${() => this.toggleCollection(collection.id)}
                                @menu=${(e) => { this.selectCollection(collection.id); this._openMenuForCollection(collection, e.detail.x, e.detail.y); }}>
                            </zero-tree-item>
                            ${isExpanded ? this.renderItemTree(collection.items, null, 1) : ''}
                        `;
                    })}
                </div>
            </div>
        `;
    }

    renderRequestForm() {
        const form = this.requestForm;
        const isReal = form.kind === 'real';
        const isMock = form.kind === 'mock';
        const isProxy = form.kind === 'proxy';
        return html`
            <form @submit=${this.saveRequest} class="section-gap">
                <div class="cols">
                    <label>Name
                        <input name="name" .value=${form.name} @input=${this.updateRequestForm} placeholder="My API" />
                    </label>
                    <label>Method
                        <select name="method" .value=${form.method} @change=${this.updateRequestForm}>
                            ${METHODS.map((m) => html`<option value=${m}>${m}</option>`)}
                        </select>
                    </label>
                </div>
                <div class="cols">
                    <label>Kind
                        <select name="kind" .value=${form.kind} @change=${this.updateRequestForm}>
                            ${REQUEST_KINDS.map((k) => html`<option value=${k}>${k}</option>`)}
                        </select>
                    </label>
                    <label>Parent folder
                        <select name="parentId" .value=${form.parentId || ''} @change=${this.updateRequestForm}>
                            <option value="">Root</option>
                            ${(this.selectedCollection?.items || []).filter((i) => i.type === 'folder').map((i) => html`<option value=${i.id}>${i.name}</option>`)}
                        </select>
                    </label>
                </div>
                <label>Description
                    <textarea name="description" .value=${form.description} @input=${this.updateRequestForm} style="min-height:52px;"></textarea>
                </label>

                ${isReal ? html`
                    <label>Target URL
                        <input name="url" .value=${form.url} @input=${this.updateRequestForm} placeholder="https://api.example.com/users" />
                    </label>
                ` : html`
                    <label>Local route path
                        <input name="mockPath" .value=${form.mockPath} @input=${this.updateRequestForm} placeholder="/api/users" />
                    </label>
                `}

                ${isProxy ? html`
                    <label>Proxy target URL
                        <input name="proxyTargetUrl" .value=${form.proxyTargetUrl} @input=${this.updateRequestForm} placeholder="https://api.example.com/v2" />
                    </label>
                    <label>Delay (ms)
                        <input name="mockDelayMs" type="number" .value=${String(form.mockDelayMs)} @input=${this.updateRequestForm} />
                    </label>
                    <label>Response headers <span class="muted" style="font-size:0.75rem;">(override upstream)</span>
                        <textarea name="responseHeadersText" .value=${form.responseHeadersText} @input=${this.updateRequestForm} style="min-height:52px;"></textarea>
                    </label>
                ` : ''}

                ${isMock ? html`
                    <div class="cols">
                        <label>Status code
                            <input name="mockStatusCode" type="number" .value=${String(form.mockStatusCode)} @input=${this.updateRequestForm} />
                        </label>
                        <label>Delay (ms)
                            <input name="mockDelayMs" type="number" .value=${String(form.mockDelayMs)} @input=${this.updateRequestForm} />
                        </label>
                    </div>
                    <label>Response headers
                        <textarea name="responseHeadersText" .value=${form.responseHeadersText} @input=${this.updateRequestForm} style="min-height:52px;"></textarea>
                    </label>
                    <label>Template body <span class="muted" style="font-size:0.75rem;">(Handlebars — use {{request.method}}, {{request.query}}, {{now}}, etc.)</span>
                        <textarea name="mockTemplateBody" .value=${form.mockTemplateBody} @input=${this.updateRequestForm}></textarea>
                    </label>
                ` : ''}

                ${!isProxy ? html`
                    <label>Request headers
                        <textarea name="headersText" .value=${form.headersText} @input=${this.updateRequestForm} style="min-height:52px;"></textarea>
                    </label>
                    <label>Request body
                        <textarea name="body" .value=${form.body} @input=${this.updateRequestForm} style="min-height:52px;"></textarea>
                    </label>
                ` : ''}

                <div class="actions" style="margin-top:0;">
                    <zero-button @click=${this.saveRequest}>Save</zero-button>
                    ${this.selectedRequestItem ? html`<zero-button tone="warn" @click=${() => this.deleteItem(this.selectedRequestItem.id)}>Delete</zero-button>` : ''}
                    ${this.selectedRequestItem ? html`<zero-button tone="alt" @click=${() => this.loadTriggerFromRequest(this.selectedRequestItem, true)}>Trigger now</zero-button>` : ''}
                </div>
            </form>
        `;
    }

    renderFolderForm() {
        const form = this.folderForm;
        return html`
            <div class="cols">
                <label>
                    Folder name
                    <input name="name" .value=${form.name} @input=${this.updateFolderForm} />
                </label>
                <label>
                    Parent folder
                    <select name="parentId" .value=${form.parentId || ''} @change=${this.updateFolderForm}>
                        <option value="">Root</option>
                        ${(this.selectedCollection?.items || []).filter((item) => item.type === 'folder' && item.id !== form.id).map((item) => html`<option value=${item.id}>${item.name}</option>`)}
                    </select>
                </label>
            </div>
            <label>
                Description
                <textarea name="description" .value=${form.description || ''} @input=${this.updateFolderForm}></textarea>
            </label>
            <div class="actions">
                <zero-button @click=${this.saveFolder}>Save folder</zero-button>
                ${this.selectedItem?.type === 'folder' ? html`<zero-button tone="warn" @click=${() => this.deleteItem(this.selectedItem.id)}>Delete</zero-button>` : ''}
            </div>
        `;
    }

    renderDetailPanel() {
        const selectedCollection = this.selectedCollection;
        const selectedItem = this.selectedItem;
        const selectedRequest = this.selectedRequestItem;
        const activeEnvironment = this.activeEnvironment;
        const mocks = this.state.mocks || [];
        const requests = this.selectedCollectionRequests;

        // Nothing selected at all
        if (!selectedCollection) {
            return html`
                <div class="detail-panel">
                    <zero-empty-state icon="📦" heading="Select a collection" message="Pick a collection from the sidebar, or create one to get started."></zero-empty-state>
                </div>
            `;
        }

        // ── API selected OR New API form ──
        if (selectedRequest || (this.requestForm && this.requestForm.type === 'request' && !this.selectedItemId)) {
            const reqRef = selectedRequest || this.requestForm;
            const isNew = !selectedRequest;
            const kindLabel = reqRef.kind === 'real' ? 'Real API' : reqRef.kind === 'mock' ? 'Mock API' : 'Proxy API';
            const kindClass = 'kind-chip kind-' + reqRef.kind;
            const localPath = reqRef.mockConfig?.path || '/api/example';
            return html`
                <div class="detail-panel">
                    <div class="panel">
                        <div class="detail-header">
                            <div>
                                <div class="detail-title">${isNew ? `New ${kindLabel}` : reqRef.name}</div>
                                <div class="detail-meta">
                                    <span class=${kindClass}>${kindLabel}</span>
                                    <span class="kind-chip" style="background:rgba(255,255,255,0.06);color:#9db0c7;">${reqRef.method}</span>
                                    ${isNew ? html`<span class="kind-chip" style="background:rgba(246,173,85,0.15);color:#f6ad55;">Draft</span>` : ''}
                                </div>
                            </div>
                            <div class="actions" style="margin-top:0;">
                                ${!isNew ? html`<zero-button @click=${() => this.loadTriggerFromRequest(reqRef, true)}>▶ Trigger</zero-button>` : ''}
                            </div>
                        </div>
                        <div class="muted">${reqRef.kind === 'real' ? (reqRef.url || 'No URL set') : `${window.location.origin}${localPath}`}</div>
                        ${reqRef.description ? html`<p style="margin-top:8px;font-size:0.84rem;">${reqRef.description}</p>` : ''}
                    </div>
                    <div class="panel section-gap">
                        <p class="panel-heading">${isNew ? 'Create API' : 'Edit API'}</p>
                        ${this.renderRequestForm()}
                    </div>
                    ${this.triggerResult && !isNew ? html`
                        <div class="panel">
                            <p class="panel-heading">Last Trigger Result</p>
                            <pre>${prettyJson(this.triggerResult)}</pre>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // ── Folder selected OR New Folder form ──
        if ((selectedItem?.type === 'folder') || (this.folderForm && this.folderForm.type === 'folder' && !this.selectedItemId)) {
            const folder = selectedItem || this.folderForm;
            const isNewFolder = !selectedItem;
            const children = selectedCollection ? (selectedCollection.items || []).filter((i) => i.parentId === folder.id) : [];
            return html`
                <div class="detail-panel">
                    <div class="panel">
                        <div class="detail-header">
                            <div>
                                <div class="detail-title">📁 ${isNewFolder ? 'New Folder' : folder.name}</div>
                                <div class="detail-meta">
                                    <span class="kind-chip" style="background:rgba(255,255,255,0.06);color:#9db0c7;">${children.length} item${children.length !== 1 ? 's' : ''}</span>
                                    ${isNewFolder ? html`<span class="kind-chip" style="background:rgba(246,173,85,0.15);color:#f6ad55;">Draft</span>` : ''}
                                </div>
                            </div>
                        </div>
                        ${folder.description ? html`<p style="font-size:0.84rem;">${folder.description}</p>` : ''}
                    </div>
                    <div class="panel section-gap">
                        <p class="panel-heading">${isNewFolder ? 'Create Folder' : 'Edit Folder'}</p>
                        ${this.renderFolderForm()}
                    </div>
                    ${!isNewFolder ? html`
                        <div class="panel">
                            <p class="panel-heading">Contents</p>
                            ${children.length === 0
                                ? html`<zero-empty-state icon="○" heading="Empty folder" message="Use the ⋯ menu or right-click to add APIs or sub-folders here."></zero-empty-state>`
                                : this.renderItemTree(selectedCollection.items, folder.id, 0)}
                        </div>
                    ` : ''}
                    <div class="actions" style="margin-top:0;">
                        <zero-button @click=${() => this.newRequest(folder.id, 'real')}>+ Real API</zero-button>
                        <zero-button tone="alt" @click=${() => this.newRequest(folder.id, 'mock')}>+ Mock</zero-button>
                        <zero-button tone="alt" @click=${() => this.newRequest(folder.id, 'proxy')}>+ Proxy</zero-button>
                        <zero-button @click=${() => this.newFolder(folder.id)}>+ Sub-folder</zero-button>
                    </div>
                </div>
            `;
        }

        // Collection selected (no item)
        return html`
            <div class="detail-panel">
                <div class="panel">
                    <div class="detail-header">
                        <div>
                            <div class="detail-title">${selectedCollection.name}</div>
                            <div class="detail-meta">
                                <span class="kind-chip" style="background:rgba(255,255,255,0.06);color:#9db0c7;">${requests.length} APIs</span>
                                <span class="kind-chip" style="background:rgba(255,255,255,0.06);color:#9db0c7;">${(selectedCollection.items||[]).filter(i=>i.type==='folder').length} folders</span>
                                <span class="kind-chip" style="background:rgba(79,209,197,0.1);color:#4fd1c5;">${mocks.filter(m=>requests.some(r=>r.mockId===m.id)).length} live endpoints</span>
                            </div>
                        </div>
                        <div class="actions" style="margin-top:0;">
                            <zero-button tone="alt" @click=${this.openCollectionRunner}>▶ Runner</zero-button>
                        </div>
                    </div>
                    ${selectedCollection.description ? html`<p style="font-size:0.84rem;">${selectedCollection.description}</p>` : ''}
                </div>
                <div class="panel section-gap">
                    <p class="panel-heading">Collection Settings</p>
                    <div class="cols">
                        <label>Name <input name="name" .value=${selectedCollection.name} @input=${this.updateCollectionField} /></label>
                        <label>Description <input name="description" .value=${selectedCollection.description||''} @input=${this.updateCollectionField} /></label>
                    </div>
                    <div class="actions" style="margin-top:0;">
                        <zero-button @click=${this.saveCollection}>Save</zero-button>
                        <zero-button tone="warn" @click=${this.deleteCollection}>Delete collection</zero-button>
                    </div>
                </div>
                <div class="panel">
                    <p class="panel-heading">Environments</p>
                    <div class="actions" style="margin-top:0; margin-bottom:12px;">
                        <zero-button tone="alt" @click=${this.addEnvironment}>+ Environment</zero-button>
                    </div>
                    <div class="section-gap">
                        ${(selectedCollection.environments || []).map((env) => html`
                            <div class=${'env-card' + (selectedCollection.activeEnvironmentId===env.id?' env-active':'')}>
                                <div class="actions" style="margin-top:0;">
                                    <span style="flex:1;font-weight:700;font-size:0.88rem;">${env.name}</span>
                                    <zero-button tone="alt" compact @click=${()=>this.activateEnvironment(env.id)}>
                                        ${selectedCollection.activeEnvironmentId===env.id ? '✓ Active' : 'Activate'}
                                    </zero-button>
                                    <zero-button tone="warn" compact @click=${()=>this.deleteEnvironment(env.id)}>Delete</zero-button>
                                </div>
                                <label>Name <input .value=${env.name} @input=${(e)=>this.updateEnvironmentField(env.id,'name',e.target.value)} /></label>
                                <label>Variables (one per line, key: value)
                                    <textarea .value=${textFromObject(env.variables||{})} @input=${(e)=>this.updateEnvironmentField(env.id,'variables',e.target.value)} style="min-height:60px;"></textarea>
                                </label>
                            </div>
                        `)}
                        ${!(selectedCollection.environments||[]).length ? html`<div class="muted">No environments yet.</div>` : ''}
                    </div>
                    ${activeEnvironment ? html`<div class="muted" style="margin-top:10px;">Active: <strong>${activeEnvironment.name}</strong>. Use <code>{{env.base_url}}</code> in templates.</div>` : ''}
                </div>
                <div class="panel">
                    <p class="panel-heading">Quick Add</p>
                    <div class="actions" style="margin-top:0;">
                        <zero-button @click=${()=>this.newRequest(null,'real')}>+ Real API</zero-button>
                        <zero-button tone="alt" @click=${()=>this.newRequest(null,'mock')}>+ Mock</zero-button>
                        <zero-button tone="alt" @click=${()=>this.newRequest(null,'proxy')}>+ Proxy</zero-button>
                        <zero-button @click=${()=>this.newFolder(null)}>+ Folder</zero-button>
                    </div>
                </div>
                <div class="panel">
                    <p class="panel-heading">Import</p>
                    <textarea .value=${this.importText} @input=${(e)=>{this.importText=e.target.value;}}></textarea>
                    <div class="actions" style="margin-top:8px;">
                        <zero-button @click=${this.importItems}>Import into collection</zero-button>
                    </div>
                </div>
            </div>
        `;
    }

    render() {
        const collections = this.state.collections || [];
        const mocks = this.state.mocks || [];
        const requests = this.selectedCollectionRequests;
        const selectedRequest = this.selectedRequestItem;
        const selectedKindLabel = selectedRequest
            ? (selectedRequest.kind === 'real' ? 'Real API' : selectedRequest.kind === 'mock' ? 'Mock API' : 'Proxy API')
            : '';
        return html`
            <div class="shell">
                <section class="hero">
                    <div class="hero-card">
                        <zero-badge>Collections + real APIs + mocks + proxy</zero-badge>
                        <h1>MockDeck</h1>
                        <p>Organize APIs into collections, folders, and subfolders. Each request can be a real API, a local mock, or a local proxy to another URL.</p>
                        <div class="actions">
                            <zero-button @click=${this.createCollection}>New collection</zero-button>
                            <zero-button tone="alt" href=${this.runnerBase}>Open Runner</zero-button>
                        </div>
                    </div>
                    <div class="stats">
                        <zero-stat-card value=${String(collections.length)} label="Collections"></zero-stat-card>
                        <zero-stat-card value=${String(requests.length)} label="APIs in collection"></zero-stat-card>
                        <zero-stat-card value=${String(mocks.length)} label="Active endpoints"></zero-stat-card>
                        <zero-stat-card value=${String((this.selectedCollection?.items||[]).filter(i=>i.type==='folder').length)} label="Folders"></zero-stat-card>
                    </div>
                </section>

                <div class="app-layout">
                    ${this.renderSidebar()}
                    ${this.renderDetailPanel()}
                    <div class="console-panel">
                        <div class="panel" style="flex-shrink:0;">
                            <p class="panel-heading">Request Console</p>
                            ${selectedRequest ? html`<div class="muted" style="margin-bottom:10px;">Loaded: ${selectedRequest.name} (${selectedKindLabel})</div>` : html`<div class="muted" style="margin-bottom:10px;">Select an API or type manually.</div>`}
                            <form @submit=${this.sendTrigger} class="section-gap">
                                <div class="cols">
                                    <label>Method
                                        <select .value=${this.trigger.method} @change=${(e)=>{this.trigger={...this.trigger,method:e.target.value};}}>
                                            ${METHODS.filter(m=>m!=='ANY').map(m=>html`<option value=${m}>${m}</option>`)}
                                        </select>
                                    </label>
                                    <label>URL
                                        <input .value=${this.trigger.url} @input=${(e)=>{this.trigger={...this.trigger,url:e.target.value};}} />
                                    </label>
                                </div>
                                <label>Headers
                                    <textarea .value=${this.trigger.headersText} @input=${(e)=>{this.trigger={...this.trigger,headersText:e.target.value};}} style="min-height:60px;"></textarea>
                                </label>
                                <label>Body
                                    <textarea .value=${this.trigger.body} @input=${(e)=>{this.trigger={...this.trigger,body:e.target.value};}} style="min-height:60px;"></textarea>
                                </label>
                                <div class="actions" style="margin-top:0;">
                                    <zero-button @click=${this.sendTrigger}>Send</zero-button>
                                    ${selectedRequest ? html`<zero-button tone="alt" @click=${()=>this.loadTriggerFromRequest(selectedRequest,false)}>Reload</zero-button>` : ''}
                                </div>
                            </form>
                        </div>
                        ${this.triggerResult ? html`
                            <div class="panel">
                                <p class="panel-heading">Response</p>
                                <pre>${prettyJson(this.triggerResult)}</pre>
                            </div>
                        ` : html`<div class="muted" style="padding:12px;">Send a request to see the response here.</div>`}
                    </div>
                </div>
            </div>

            <zero-context-menu
                ?open=${this.contextMenu.open}
                .x=${this.contextMenu.x}
                .y=${this.contextMenu.y}
                .items=${this.contextMenu.items}
                @select=${this._handleMenuSelect}
                @close=${this._closeMenu}>
            </zero-context-menu>

            ${this.toast ? html`<div class="toast">${this.toast}</div>` : ''}
        `;
    }
}

customElements.define('mockdeck-app', MockDeckApp);
