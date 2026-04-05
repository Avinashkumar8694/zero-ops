import { LitElement, html, css } from 'lit';
import '/lit_component/zero-badge.js';
import '/lit_component/zero-button.js';
import '/lit_component/zero-list-item.js';
import '/lit_component/zero-panel.js';
import '/lit_component/zero-stat-card.js';
import '/lit_component/zero-tree-item.js';
import '/lit_component/zero-context-menu.js';
import '/lit_component/zero-empty-state.js';
import '/lit_component/zero-input.js';
import '/lit_component/zero-textarea.js';
import '/lit_component/zero-select.js';
import '/lit_component/zero-file-picker.js';
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
        contextMenu: { state: true },
        activeTab: { state: true }
    };

    static styles = css`
        :host { display: block; padding: 18px; color: #edf4ff; font-family: 'Inter', system-ui, sans-serif; }
        .shell { max-width: 1680px; margin: 0 auto; display: grid; gap: 18px; }
        .hero { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }
        .app-layout { 
            display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 0; 
            height: calc(100vh - 220px); min-height: 500px; border-radius: 18px; 
            border: 1px solid rgba(255,255,255,0.08); overflow: hidden; background: rgba(255,255,255,0.01); 
        }
        .sidebar { display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.06); overflow: hidden; background: rgba(6,16,26,0.3); }
        .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
        .sidebar-title { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #9db0c7; }
        .sidebar-tree { flex: 1; overflow-y: auto; padding: 6px 6px; }
        
        .detail-panel { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
        .detail-tabs { 
            display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.08); 
            background: rgba(0,0,0,0.15); padding: 0 20px; flex-shrink: 0;
        }
        .detail-tab { 
            padding: 12px 18px; cursor: pointer; color: #9db0c7; font-size: 0.78rem; 
            font-weight: 800; border-bottom: 2px solid transparent; transition: 0.2s; 
            text-transform: uppercase; letter-spacing: 0.05em;
        }
        .detail-tab:hover { color: #edf4ff; background: rgba(255,255,255,0.02); }
        .detail-tab.active { color: #4fd1c5; border-bottom-color: #4fd1c5; background: rgba(79,209,197,0.05); }
        
        .detail-content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        
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
        .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .muted { color: #9db0c7; font-size: 0.84rem; line-height: 1.5; }
        pre { margin: 0; padding: 12px; border-radius: 12px; background: rgba(6,16,26,0.85); overflow: auto; font-size: 0.82rem; color: #cfe0f6; }
        .kind-chip { display: inline-flex; padding: 3px 9px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; }
        .kind-real  { background: rgba(156,163,175,0.12); color: #9ca3af; }
        .kind-mock  { background: rgba(79,209,197,0.12);  color: #4fd1c5; }
        .kind-proxy { background: rgba(246,173,85,0.12);  color: #f6ad55; }
        .detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
        .detail-title { font-size: 1.1rem; font-weight: 700; line-height: 1.2; }
        .detail-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
        .toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 16px; border-radius: 14px; background: rgba(6,16,26,0.95); border: 1px solid rgba(79,209,197,0.35); z-index: 9999; font-size: 0.88rem; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .env-card { border-radius: 12px; border: 1px solid rgba(255,255,255,0.07); padding: 12px; background: rgba(255,255,255,0.02); display: grid; gap: 10px; }
        .env-active { border-color: rgba(79,209,197,0.3); }
        .section-gap { display: grid; gap: 12px; }

        /* Form Data Grid Polish */
        .form-data-grid { background: rgba(0,0,0,0.1); border-radius: 12px; padding: 12px; border: 1px solid rgba(255,255,255,0.06); margin-top: 8px; }
        .form-data-grid table { border-spacing: 0; width: 100%; table-layout: fixed; }
        .form-data-grid th { text-align: left; padding: 0 8px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 0.65rem; color: #9db0c7; text-transform: uppercase; letter-spacing: 0.04em; }
        .form-data-grid td { padding: 4px; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; }
        .form-data-grid tr:hover td { background: rgba(255,255,255,0.01); }
        .form-data-grid zero-input, .form-data-grid zero-file-picker { width: 100%; }

        @media (max-width: 1200px) { .app-layout { grid-template-columns: 260px minmax(0,1fr); } }
        @media (max-width: 860px) { .hero { grid-template-columns: 1fr; } .stats { grid-template-columns: 1fr; } .app-layout { grid-template-columns: 1fr; height: auto; } }
    `;

    constructor() {
        super();
        this.apiBase = this.dataset.apiBase || '/__mockdeck/api';
        this.runnerBase = this.dataset.runnerBase || '/__mockdeck/runner';
        this.state = JSON.parse(this.dataset.state || '{}');
        this.selectedCollectionId = this.state.collections?.[0]?.id || '';
        this.selectedItemId = '';
        this.requestForm = null;
        this.folderForm = null;
        this.importText = '';
        this.trigger = { method: 'GET', url: `${window.location.origin}/api/health`, headersText: '', body: '', fileData: null, fileName: null };
        this.triggerResult = null;
        this.toast = '';
        this.expandedCollections = new Set(this.state.collections?.length ? [this.state.collections[0]?.id] : []);
        this.expandedFolders = new Set();
        this.activeTab = 'settings';
        this.contextMenu = { open: false, x: 0, y: 0, items: [], targetId: '' };
    }

    get selectedCollection() {
        return (this.state.collections || []).find((c) => c.id === this.selectedCollectionId) || null;
    }

    get selectedItem() {
        return (this.selectedCollection?.items || []).find((i) => i.id === this.selectedItemId) || null;
    }

    get selectedRequestItem() {
        const item = this.selectedItem;
        return item?.type === 'request' ? item : null;
    }

    get selectedCollectionRequests() {
        return (this.selectedCollection?.items || []).filter((item) => item.type === 'request');
    }

    get activeEnvironment() {
        return (this.selectedCollection?.environments || []).find((e) => e.id === this.selectedCollection?.activeEnvironmentId) || null;
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

    async createCollection() {
        const name = prompt('Collection Name:', 'New Collection');
        if (!name) return;
        const response = await api(`${this.apiBase}/collections`, {
            method: 'POST',
            body: JSON.stringify({ name, items: [], environments: [] })
        });
        await this.refreshState();
        this.selectCollection(response.collection.id);
        this.setToast('Collection created.');
    }

    selectCollection(collectionId) {
        this.selectedCollectionId = collectionId;
        this.selectedItemId = '';
        this.activeTab = 'settings';
        this.requestForm = null;
        this.folderForm = null;
    }

    selectItem(item) {
        this.selectedItemId = item.id;
        this.activeTab = 'settings';
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
            responseHeadersText: textFromObject(item.mockConfig?.responseHeaders || {}),
            fileData: item.fileData || null,
            fileName: item.fileName || null,
            bodyType: item.bodyType || 'raw',
            formData: item.formData || []
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

    addFormDataRow() {
        if (!this.requestForm) return;
        const rows = [...(this.requestForm.formData || [])];
        rows.push({ key: '', value: '', type: 'text', fileName: '' });
        this.requestForm = { ...this.requestForm, formData: rows };
    }

    removeFormDataRow(index) {
        if (!this.requestForm) return;
        const rows = [...(this.requestForm.formData || [])];
        rows.splice(index, 1);
        this.requestForm = { ...this.requestForm, formData: rows };
    }

    updateFormDataRow(index, field, value, fileName = null) {
        if (!this.requestForm) return;
        const rows = [...(this.requestForm.formData || [])];
        rows[index] = { ...rows[index], [field]: value };
        if (fileName) rows[index].fileName = fileName;
        this.requestForm = { ...this.requestForm, formData: rows };
    }

    addTriggerFormDataRow() {
        const rows = [...(this.trigger.formData || [])];
        rows.push({ key: '', value: '', type: 'text', fileName: '' });
        this.trigger = { ...this.trigger, formData: rows };
    }

    removeTriggerFormDataRow(index) {
        const rows = [...(this.trigger.formData || [])];
        rows.splice(index, 1);
        this.trigger = { ...this.trigger, formData: rows };
    }

    updateTriggerFormDataRow(index, field, value, fileName = null) {
        const rows = [...(this.trigger.formData || [])];
        rows[index] = { ...rows[index], [field]: value };
        if (fileName) rows[index].fileName = fileName;
        this.trigger = { ...this.trigger, formData: rows };
    }

    updateFolderForm(event) {
        const { name, value } = event.target;
        this.folderForm = { ...this.folderForm, [name]: value };
    }

    newFolder(parentId = null) {
        this.selectedItemId = '';
        this.activeTab = 'settings';
        this.requestForm = null;
        this.folderForm = emptyFolder(parentId);
    }

    newRequest(parentId = null, kind = 'real') {
        this.selectedItemId = '';
        this.activeTab = 'settings';
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
        this.folderForm = null;
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
            },
            fileData: this.requestForm.fileData,
            fileName: this.requestForm.fileName,
            bodyType: this.requestForm.bodyType || 'raw',
            formData: this.requestForm.formData || []
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

    async addEnvironment() {
        const collection = this.selectedCollection;
        if (!collection) return;
        const environment = {
            id: `env-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`,
            name: `Environment ${(collection.environments || []).length + 1}`,
            variables: {}
        };
        const environments = [...(collection.environments || []), environment];
        const next = { ...collection, environments, activeEnvironmentId: collection.activeEnvironmentId || environment.id };
        this.state = {
            ...this.state,
            collections: (this.state.collections || []).map((c) => c.id === collection.id ? next : c)
        };
    }

    updateEnvironmentField(envId, field, value) {
        const collection = this.selectedCollection;
        if (!collection) return;
        const next = {
            ...collection,
            environments: (collection.environments || []).map((e) => e.id === envId 
                ? { ...e, [field]: field === 'variables' ? objectFromText(value) : value } 
                : e)
        };
        this.state = {
            ...this.state,
            collections: (this.state.collections || []).map((c) => c.id === collection.id ? next : c)
        };
    }

    activateEnvironment(envId) {
        const collection = this.selectedCollection;
        if (!collection) return;
        const next = { ...collection, activeEnvironmentId: envId };
        this.state = {
            ...this.state,
            collections: (this.state.collections || []).map((c) => c.id === collection.id ? next : c)
        };
    }

    deleteEnvironment(envId) {
        const collection = this.selectedCollection;
        if (!collection) return;
        const environments = (collection.environments || []).filter((e) => e.id !== envId);
        const next = {
            ...collection,
            environments,
            activeEnvironmentId: collection.activeEnvironmentId === envId ? (environments[0]?.id || '') : collection.activeEnvironmentId
        };
        this.state = {
            ...this.state,
            collections: (this.state.collections || []).map((c) => c.id === collection.id ? next : c)
        };
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
        if (event) event.preventDefault();
        this.triggerResult = await api(`${this.apiBase}/trigger`, {
            method: 'POST',
            body: JSON.stringify({
                method: this.trigger.method,
                url: this.trigger.url,
                headers: objectFromText(this.trigger.headersText),
                body: this.trigger.body,
                bodyType: this.trigger.bodyType || 'none',
                formData: this.trigger.formData || [],
                fileData: this.trigger.fileData,
                fileName: this.trigger.fileName
            })
        });
    }

    loadTriggerFromRequest(item, shouldSend = false) {
        if (!item) return;
        const url = item.kind === 'real' ? item.url : `${window.location.origin}${item.mockConfig?.path || item.path || '/api/example'}`;
        this.trigger = {
            method: item.method || 'GET',
            url: url,
            headersText: textFromObject(item.headers || {}),
            bodyType: item.bodyType || 'raw',
            body: item.body || '',
            formData: [...(item.formData || [])],
            fileData: item.fileData || null,
            fileName: item.fileName || null
        };
        this.activeTab = 'console';
        if (shouldSend) {
            this.triggerResult = null;
            setTimeout(() => this.sendTrigger(), 100);
        }
    }

    openCollectionRunner() {
        window.location.href = this.runnerBase;
    }

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

    _closeMenu() { this.contextMenu = { ...this.contextMenu, open: false }; }
    _handleMenuSelect(event) { event.detail?.action?.(); this._closeMenu(); }

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

    renderItemTree(collectionItems, parentId = null, depth = 0) {
        const items = (collectionItems || [])
            .filter((i) => (i.parentId || null) === parentId)
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        return items.map((item) => {
            const isFolder = item.type === 'folder';
            const isExpanded = this.expandedFolders.has(item.id);
            const children = isFolder ? (collectionItems || []).filter((c) => c.parentId === item.id) : [];
            return html`
                <zero-tree-item
                    .title=${item.name}
                    .subtitle=${isFolder ? '' : (item.kind === 'real' ? (item.url || '') : (item.mockConfig?.path || ''))}
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
                    <zero-button compact @click=${() => this.createCollection()}>+</zero-button>
                </div>
                <div class="sidebar-tree">
                    ${collections.map((c) => {
                        const isExpanded = this.expandedCollections.has(c.id);
                        const isSelected = this.selectedCollectionId === c.id;
                        const reqCount = (c.items || []).filter(i => i.type === 'request').length;
                        return html`
                            <zero-tree-item
                                .title=${c.name}
                                .subtitle=${`${reqCount} API${reqCount !== 1 ? 's' : ''}`}
                                .depth=${0}
                                .itemType=${'collection'}
                                .hasChildren=${(c.items || []).length > 0}
                                .menuItems=${[true]}
                                ?expanded=${isExpanded}
                                ?active=${isSelected && !this.selectedItemId}
                                @select=${() => { this.selectCollection(c.id); if (!isExpanded) this.toggleCollection(c.id); }}
                                @toggle=${() => this.toggleCollection(c.id)}
                                @menu=${(e) => { this.selectCollection(c.id); this._openMenuForCollection(c, e.detail.x, e.detail.y); }}>
                            </zero-tree-item>
                            ${isExpanded ? this.renderItemTree(c.items, null, 1) : ''}
                        `;
                    })}
                </div>
            </div>
        `;
    }

    renderDetailPanel() {
        const c = this.selectedCollection;
        if (!c) return html`<div class="detail-panel"><div class="detail-content"><zero-empty-state icon="📦" heading="Select a collection"></zero-empty-state></div></div>`;
        const item = this.selectedItem;
        const request = this.selectedRequestItem;

        return html`
            <div class="detail-panel">
                <div class="detail-tabs">
                    <div class="detail-tab ${this.activeTab === 'settings' ? 'active' : ''}" @click=${() => this.activeTab = 'settings'}>Settings</div>
                    ${request ? html`<div class="detail-tab ${this.activeTab === 'console' ? 'active' : ''}" @click=${() => this.activeTab = 'console'}>Console / Trigger</div>` : ''}
                </div>
                <div class="detail-content">
                    ${this.activeTab === 'settings' ? this.renderSettingsPane(c, item) : this.renderConsolePane(request)}
                </div>
            </div>
        `;
    }

    renderSettingsPane(c, item) {
        if (this.folderForm) return this.renderFolderFormPane(this.folderForm);
        if (this.requestForm) return this.renderRequestFormPane(this.requestForm);
        return this.renderCollectionSettings(c);
    }

    renderCollectionSettings(c) {
        const requests = this.selectedCollectionRequests;
        return html`
            <div class="panel">
                <div class="detail-header">
                    <div class="detail-title">${c.name}</div>
                    <zero-button tone="alt" @click=${this.openCollectionRunner}>▶ Open Runner Dashboard</zero-button>
                </div>
            </div>
            <div class="panel section-gap">
                <p class="panel-heading">Collection Config</p>
                <div class="cols">
                    <zero-input label="Name" name="name" .value=${c.name} @change=${this.updateCollectionField}></zero-input>
                    <zero-input label="Description" name="description" .value=${c.description||''} @change=${this.updateCollectionField}></zero-input>
                </div>
                <div class="actions">
                    <zero-button @click=${this.saveCollection}>Save Collection</zero-button>
                    <zero-button tone="warn" @click=${this.deleteCollection}>Delete</zero-button>
                </div>
            </div>
            <div class="panel">
                <p class="panel-heading">Environments</p>
                <div class="actions" style="margin-bottom:12px;"><zero-button tone="alt" compact @click=${this.addEnvironment}>+ New Environment</zero-button></div>
                <div class="section-gap">
                    ${(c.environments || []).map((env) => html`
                        <div class=${'env-card' + (c.activeEnvironmentId===env.id?' env-active':'')}>
                            <div class="actions">
                                <span style="flex:1;font-weight:700;">${env.name}</span>
                                <zero-button tone="alt" compact @click=${()=>this.activateEnvironment(env.id)}>${c.activeEnvironmentId===env.id ? '✓ Active' : 'Activate'}</zero-button>
                                <zero-button tone="warn" compact @click=${()=>this.deleteEnvironment(env.id)}>Delete</zero-button>
                            </div>
                            <zero-input label="Name" .value=${env.name} @change=${(e)=>this.updateEnvironmentField(env.id,'name',e.detail.value)}></zero-input>
                            <zero-textarea label="Variables (JSON/Text)" .value=${textFromObject(env.variables||{})} @change=${(e)=>this.updateEnvironmentField(env.id,'variables',e.detail.value)}></zero-textarea>
                        </div>
                    `)}
                </div>
            </div>
            <div class="panel">
                <p class="panel-heading">Quick Import</p>
                <zero-textarea label="Import JSON List" .value=${this.importText} @change=${(e)=>this.importText=e.detail.value} placeholder='[{ "type": "request", ... }]'></zero-textarea>
                <div class="actions" style="margin-top:8px;"><zero-button @click=${this.importItems}>Import items</zero-button></div>
            </div>
        `;
    }

    renderFolderFormPane(f) {
        return html`
            <div class="panel"><div class="detail-title">📁 ${f.name || 'New Folder'}</div></div>
            <div class="panel section-gap">
                <p class="panel-heading">Folder Config</p>
                <div class="cols">
                    <zero-input label="Name" name="name" .value=${f.name} @change=${this.updateFolderForm}></zero-input>
                    <zero-select label="Parent" name="parentId" .value=${f.parentId||''} 
                        .options=${[{value: '', label: 'Root'}, ...(this.selectedCollection?.items||[]).filter(i=>i.type==='folder'&&i.id!==f.id).map(i=>({value: i.id, label: i.name}))]}
                        @change=${this.updateFolderForm}>
                    </zero-select>
                </div>
                <div class="actions">
                    <zero-button @click=${this.saveFolder}>Save Folder</zero-button>
                    ${f.id ? html`<zero-button tone="warn" @click=${()=>this.deleteItem(f.id)}>Delete</zero-button>` : ''}
                </div>
            </div>
        `;
    }

    renderRequestFormPane(form) {
        const isReal = form.kind === 'real';
        const isMock = form.kind === 'mock';
        const isProxy = form.kind === 'proxy';
        return html`
            <div class="panel">
                <div class="detail-header">
                    <div>
                        <div class="detail-title">${form.name || 'New API'}</div>
                        <div class="detail-meta">
                            <span class=${'kind-chip kind-' + form.kind}>${form.kind.toUpperCase()}</span>
                            <span class="kind-chip" style="background:rgba(255,255,255,0.06);color:#9db0c7;">${form.method}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="panel">
                <p class="panel-heading">API Configuration</p>
                <form @submit=${this.saveRequest} class="section-gap">
                    <div class="cols">
                        <zero-input label="Name" name="name" .value=${form.name} @change=${this.updateRequestForm}></zero-input>
                        <zero-select label="Method" name="method" .value=${form.method} 
                            .options=${METHODS.map(m=>({value:m}))}
                            @change=${this.updateRequestForm}>
                        </zero-select>
                    </div>
                    <div class="cols">
                        <zero-select label="Kind" name="kind" .value=${form.kind} 
                            .options=${REQUEST_KINDS.map(k=>({value:k}))}
                            @change=${this.updateRequestForm}>
                        </zero-select>
                        <zero-select label="Parent" name="parentId" .value=${form.parentId||''} 
                            .options=${[{value:'', label:'Root'}, ...(this.selectedCollection?.items||[]).filter(i=>i.type==='folder').map(i=>({value:i.id, label:i.name}))]}
                            @change=${this.updateRequestForm}>
                        </zero-select>
                    </div>
                    ${isReal ? html`<zero-input label="Target URL" name="url" .value=${form.url} @change=${this.updateRequestForm}></zero-input>` : html`<zero-input label="Local Route Path" name="mockPath" .value=${form.mockPath} @change=${this.updateRequestForm}></zero-input>`}
                    ${isProxy ? html`<zero-input label="Proxy Target URL" name="proxyTargetUrl" .value=${form.proxyTargetUrl} @change=${this.updateRequestForm}></zero-input>` : ''}
                    
                    <div class="panel-heading" style="margin-top:16px;">Request Payload</div>
                    <div style="display:flex; gap:12px; margin-bottom:12px;">
                        ${['none', 'raw', 'multipart', 'urlencoded', 'binary'].map(type => html`
                            <label style="display:flex; align-items:center; gap:5px; font-size:0.75rem; color:#9db0c7; cursor:pointer;">
                                <input type="radio" name="bodyType" .checked=${(form.bodyType || 'none') === type} @change=${() => this.updateRequestForm({target:{name:'bodyType',value:type}})}>
                                ${type === 'urlencoded' ? 'x-www-form' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </label>
                        `)}
                    </div>

                    ${(form.bodyType === 'raw') ? html`
                        <zero-textarea label="Raw Body (JSON/Text)" name="body" .value=${form.body} @change=${this.updateRequestForm} placeholder='{ "key": "value" }' style="min-height:180px;"></zero-textarea>
                    ` : ''}

                    ${(form.bodyType === 'binary') ? html`
                        <div class="panel" style="background:rgba(255,255,255,0.02); border-style:dashed;">
                            <zero-file-picker label="Binary File" .fileName=${form.fileName} .value=${form.fileData} @change=${(e)=>this.updateRequestForm({target:{name:'fileData',value:e.detail.value,fileName:e.detail.fileName}})}></zero-file-picker>
                        </div>
                    ` : ''}

                    ${(['multipart', 'urlencoded'].includes(form.bodyType)) ? html`
                        <div class="form-data-grid">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <span class="panel-heading" style="margin:0; font-size:0.65rem;">Key-Value Pairs</span>
                                <zero-button compact tone="alt" @click=${this.addFormDataRow}>+ Add Row</zero-button>
                            </div>
                            <table style="width:100%; border-collapse:collapse;">
                                <thead>
                                    <tr>
                                        <th style="width:30%;">Key</th>
                                        <th style="width:15%;">Type</th>
                                        <th>Value</th>
                                        <th style="width:40px;"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(form.formData || []).map((row, idx) => html`
                                        <tr>
                                            <td><zero-input .value=${row.key} @change=${(e)=>this.updateFormDataRow(idx, 'key', e.detail.value)} placeholder="Key"></zero-input></td>
                                            <td>
                                                <select style="width:100%; height:32px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#edf4ff; font-size:0.75rem;" 
                                                    @change=${(e)=>this.updateFormDataRow(idx, 'type', e.target.value)}>
                                                    <option value="text" ?selected=${row.type==='text'}>Text</option>
                                                    <option value="file" ?selected=${row.type==='file'}>File</option>
                                                </select>
                                            </td>
                                            <td>
                                                ${row.type === 'file' ? html`
                                                    <zero-file-picker .fileName=${row.fileName} .value=${row.value} @change=${(e)=>this.updateFormDataRow(idx, 'value', e.detail.value, e.detail.fileName)}></zero-file-picker>
                                                ` : html`
                                                    <zero-input .value=${row.value} @change=${(e)=>this.updateFormDataRow(idx, 'value', e.detail.value)} placeholder="Value"></zero-input>
                                                `}
                                            </td>
                                            <td><div style="cursor:pointer; color:#ff6464; text-align:center;" @click=${()=>this.removeFormDataRow(idx)}>✕</div></td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                            ${(form.formData || []).length === 0 ? html`<div class="muted" style="padding:10px; font-size:0.75rem; text-align:center;">No fields added.</div>` : ''}
                        </div>
                    ` : ''}

                    ${isMock ? html`
                        <div class="panel-heading" style="margin-top:16px;">Mock Response Configuration</div>
                        <div class="cols">
                            <zero-input label="Status Code" name="mockStatusCode" type="number" .value=${String(form.mockStatusCode)} @change=${this.updateRequestForm}></zero-input>
                            <zero-input label="Delay (ms)" name="mockDelayMs" type="number" .value=${String(form.mockDelayMs)} @change=${this.updateRequestForm}></zero-input>
                        </div>
                        <zero-textarea label="Response Headers (key: value)" name="responseHeadersText" .value=${form.responseHeadersText} @change=${this.updateRequestForm} style="min-height:100px;"></zero-textarea>
                        <zero-textarea label="Mock Body Template" name="mockTemplateBody" .value=${form.mockTemplateBody} @change=${this.updateRequestForm} style="min-height:160px;"></zero-textarea>
                    ` : ''}

                    <div class="actions" style="margin-top:24px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.06);">
                        <zero-button @click=${this.saveRequest}>Save Configuration</zero-button>
                        <zero-button tone="alt" @click=${() => this.activeTab = 'console'}>🧪 Test in Console</zero-button>
                    </div>
                </form>
            </div>
        `;
    }

    renderConsolePane(request) {
        return html`
            <div class="panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <p class="panel-heading" style="margin:0;">Request Console</p>
                    <zero-button @click=${this.sendTrigger} ?loading=${this.trigger.loading} tone=${this.trigger.error ? 'warn' : 'alt'}>
                        ${this.trigger.loading ? 'Sending...' : '⚡ Send Request'}
                    </zero-button>
                </div>

                <div class="section-gap" style="background:rgba(255,255,255,0.025); padding:16px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                    <div class="cols">
                        <zero-select label="Method" .value=${this.trigger.method} 
                            .options=${METHODS.filter(m => m !== 'ANY').map(m => ({ value: m }))}
                            @change=${(e) => this.trigger = { ...this.trigger, method: e.detail.value }}>
                        </zero-select>
                        <zero-input label="Execution URL" .value=${this.trigger.url} @change=${(e) => this.trigger = { ...this.trigger, url: e.detail.value }}></zero-input>
                    </div>
                    <zero-textarea label="Header Overrides" .value=${this.trigger.headersText} @change=${(e) => this.trigger = { ...this.trigger, headersText: e.detail.value }} style="min-height:80px;"></zero-textarea>
                    
                    <div style="font-size: 0.65rem; font-weight: 800; color: #4fd1c5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom:8px; margin-top:12px;">Body Configuration</div>
                    <div style="display:flex; gap:12px; margin-bottom:14px; padding:8px; background:rgba(0,0,0,0.2); border-radius:8px;">
                        ${['none', 'raw', 'multipart', 'urlencoded', 'binary'].map(type => html`
                            <label style="display:flex; align-items:center; gap:5px; font-size:0.75rem; color:#9db0c7; cursor:pointer;">
                                <input type="radio" name="triggerBodyType" .checked=${(this.trigger.bodyType || 'none') === type} @change=${() => this.trigger = { ...this.trigger, bodyType: type }}>
                                ${type === 'urlencoded' ? 'x-www-form' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </label>
                        `)}
                    </div>

                    ${(this.trigger.bodyType === 'raw') ? html`
                        <zero-textarea label="Raw Body" .value=${this.trigger.body} @change=${(e) => this.trigger = { ...this.trigger, body: e.detail.value }} placeholder='{ "key": "value" }' style="min-height:140px;"></zero-textarea>
                    ` : ''}

                    ${(this.trigger.bodyType === 'binary') ? html`
                        <zero-file-picker label="Binary Attachment" .fileName=${this.trigger.fileName} .value=${this.trigger.fileData} @change=${(e) => this.trigger = { ...this.trigger, fileData: e.detail.value, fileName: e.detail.fileName }}></zero-file-picker>
                    ` : ''}

                    ${(['multipart', 'urlencoded'].includes(this.trigger.bodyType)) ? html`
                        <div class="form-data-grid">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <span style="font-size: 0.65rem; font-weight: 800; color: #4fd1c5; text-transform: uppercase; letter-spacing: 0.05em; margin:0;">Payload Fields</span>
                                <zero-button compact tone="alt" @click=${this.addTriggerFormDataRow}>+ Add Field</zero-button>
                            </div>
                            <table style="width:100%; border-collapse:collapse;">
                                <tbody>
                                    ${(this.trigger.formData || []).map((row, idx) => html`
                                        <tr>
                                            <td><zero-input .value=${row.key} @change=${(e) => this.updateTriggerFormDataRow(idx, 'key', e.detail.value)} placeholder="Key"></zero-input></td>
                                            <td style="width:80px;">
                                                <select style="width:100%; height:32px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#edf4ff; font-size:0.75rem;" 
                                                    @change=${(e) => this.updateTriggerFormDataRow(idx, 'type', e.target.value)}>
                                                    <option value="text" ?selected=${row.type === 'text'}>Text</option>
                                                    <option value="file" ?selected=${row.type === 'file'}>File</option>
                                                </select>
                                            </td>
                                            <td>
                                                ${row.type === 'file' ? html`
                                                    <zero-file-picker .fileName=${row.fileName} .value=${row.value} @change=${(e) => this.updateTriggerFormDataRow(idx, 'value', e.detail.value, e.detail.fileName)}></zero-file-picker>
                                                ` : html`
                                                    <zero-input .value=${row.value} @change=${(e) => this.updateTriggerFormDataRow(idx, 'value', e.detail.value)} placeholder="Value"></zero-input>
                                                `}
                                            </td>
                                            <td style="width:30px; text-align:center;">
                                                <div style="cursor:pointer; color:#ff6464;" @click=${() => this.removeTriggerFormDataRow(idx)}>✕</div>
                                            </td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                            ${(this.trigger.formData || []).length === 0 ? html`<div class="muted" style="padding:10px; font-size:0.75rem; text-align:center;">No fields defined for override.</div>` : ''}
                        </div>
                    ` : ''}
                    
                    <div style="display:flex; justify-content:flex-end; margin-top:12px;">
                        <zero-button tone="alt" compact @click=${() => this.loadTriggerFromRequest(request, false)}>Reload from Configuration</zero-button>
                    </div>
                </div>

                ${this.triggerResult ? html`
                    <div class="panel section-gap" style="background:rgba(79,209,197,0.04); border-color:rgba(79,209,197,0.2); margin-top:16px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span class="panel-heading" style="margin:0; color:#4fd1c5;">Response Analysis</span>
                            <span style="padding: 1px 6px; border-radius: 4px; background: rgba(0,0,0,0.25); font-weight: 800; font-family: monospace; color: #cfe0f6;">${this.triggerResult.statusCode}</span>
                        </div>
                        <div class="trace-section">
                            <span style="font-size: 0.65rem; font-weight: 800; color: #4fd1c5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; opacity: 0.8;">Headers</span>
                            <pre style="background:#06101a; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.05); margin:4px 0; overflow:auto; max-height:160px; font-family:monospace; font-size:0.75rem; color:#a5d6ff;">${Object.entries(this.triggerResult.headers || {}).map(([k, v]) => `${k}: ${v}\n`)}</pre>
                        </div>
                        <div class="trace-section">
                            <span style="font-size: 0.65rem; font-weight: 800; color: #4fd1c5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; opacity: 0.8;">Body</span>
                            <pre style="background:#06101a; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.05); margin:4px 0; overflow:auto; max-height:300px; font-family:monospace; font-size:0.75rem; color:#cfe0f6;">${this.triggerResult.bodyText}</pre>
                        </div>
                    </div>
                ` : ''}

                ${this.trigger.error ? html`
                    <div class="panel section-gap" style="background:rgba(255,100,100,0.04); border-color:rgba(255,100,100,0.2); margin-top:16px;">
                        <div class="panel-heading" style="color:#ff6464;">Trigger Error</div>
                        <div style="color:#ff6464; font-size:0.86rem;">${this.trigger.error}</div>
                    </div>
                ` : !this.triggerResult ? html`<div class="muted" style="padding:20px; text-align:center; border:1px dashed rgba(255,255,255,0.05); border-radius:12px; margin-top:16px;">Trigger the API to see the live response trace.</div>` : ''}
            </div>
        `;
    }


    render() {
        const collections = this.state.collections || [];
        const requests = this.selectedCollectionRequests;
        return html`
            <div class="shell">
                <section class="hero">
                    <div class="hero-card">
                        <h1>MockDeck</h1>
                        <p>Modernized API Studio. Organize your mocks, real APIs, and proxies into powerful collections.</p>
                        <div class="actions" style="margin-top:14px;">
                            <zero-button @click=${this.createCollection}>New collection</zero-button>
                            <zero-button tone="alt" href=${this.runnerBase}>Runner Dashboard</zero-button>
                            <zero-button tone="alt" href="/__mockdeck/docs" target="_blank">Documentation 📖</zero-button>
                        </div>
                    </div>
                    <div class="stats">
                        <zero-stat-card value=${String(collections.length)} label="Collections"></zero-stat-card>
                        <zero-stat-card value=${String(requests.length)} label="APIs in view"></zero-stat-card>
                        <zero-stat-card value=${String(this.state.mocks?.length || 0)} label="Active endpoints"></zero-stat-card>
                        <zero-stat-card value=${String((this.selectedCollection?.items||[]).filter(i=>i.type==='folder').length)} label="Folders"></zero-stat-card>
                    </div>
                </section>
                <div class="app-layout">
                    ${this.renderSidebar()}
                    ${this.renderDetailPanel()}
                </div>
            </div>
            <zero-context-menu ?open=${this.contextMenu.open} .x=${this.contextMenu.x} .y=${this.contextMenu.y} .items=${this.contextMenu.items} @select=${this._handleMenuSelect} @close=${this._closeMenu}></zero-context-menu>
            ${this.toast ? html`<div class="toast">${this.toast}</div>` : ''}
        `;
    }
}
customElements.define('mockdeck-app', MockDeckApp);
