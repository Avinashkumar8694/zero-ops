import { LitElement, html, css } from 'lit';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY'];
const REQUEST_KINDS = ['real', 'mock', 'proxy'];

async function api(path, options = {}) {
    const response = await fetch(path, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    if (!response.ok) throw new Error(await response.text() || `Request failed with ${response.status}`);
    return response.json();
}

function objectFromText(text) {
    const output = {};
    String(text || '').split('\n').map((line) => line.trim()).filter(Boolean).forEach((line) => {
        const index = line.indexOf(':');
        if (index > 0) output[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    });
    return output;
}

function textFromObject(value) {
    return Object.entries(value || {}).map(([key, val]) => `${key}: ${val}`).join('\n');
}

function prettyJson(value) {
    return JSON.stringify(value ?? {}, null, 2);
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

function emptyCollection() {
    return { id: '', name: 'New Collection', description: '', items: [] };
}

function emptyRequest(parentId = null) {
    return {
        id: '',
        type: 'request',
        kind: 'real',
        parentId,
        name: '',
        description: '',
        method: 'GET',
        url: '',
        headersText: '',
        body: '',
        mockPath: '/api/example',
        mockStatusCode: 200,
        mockDelayMs: 0,
        mockTemplateBody: '{\n  "ok": true\n}',
        proxyTargetUrl: '',
        responseHeadersText: 'content-type: application/json; charset=utf-8'
    };
}

function emptyFolder(parentId = null) {
    return { id: '', type: 'folder', kind: 'folder', parentId, name: 'New Folder', description: '', folderColor: '' };
}

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
        toast: { state: true }
    };

    static styles = css`
        :host { display: block; padding: 18px; color: #edf4ff; }
        .shell { max-width: 1680px; margin: 0 auto; display: grid; gap: 18px; }
        .hero, .layout { display: grid; gap: 18px; }
        .hero { grid-template-columns: 1.4fr 1fr; }
        .layout { grid-template-columns: 320px minmax(0, 1fr) 420px; align-items: start; }
        .panel {
            min-width: 0;
            background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            box-shadow: 0 24px 60px rgba(0,0,0,0.28);
            padding: 18px;
        }
        .hero-card {
            padding: 22px;
            border-radius: 24px;
            border: 1px solid rgba(255,255,255,0.08);
            background:
                radial-gradient(circle at top left, rgba(79,209,197,0.15), transparent 34%),
                linear-gradient(135deg, rgba(246,173,85,0.12), rgba(255,255,255,0.03));
        }
        h1 { margin: 0 0 12px; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 0.95; letter-spacing: -0.04em; }
        h2, h3 { margin: 0; font-size: 1rem; letter-spacing: 0.04em; text-transform: uppercase; }
        p { margin: 6px 0 0; color: #9db0c7; line-height: 1.6; }
        .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .stat { padding: 14px 16px; border-radius: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); }
        .stat strong { display: block; font-size: 1.4rem; }
        .stat span { color: #9db0c7; font-size: 0.88rem; }
        .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
        .btn, button {
            border: 0;
            border-radius: 999px;
            padding: 10px 15px;
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
            min-width: 0;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(6, 16, 26, 0.65);
            color: #edf4ff;
            padding: 11px 13px;
        }
        textarea { min-height: 100px; resize: vertical; font-family: "SFMono-Regular", Menlo, monospace; }
        .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .tree { display: grid; gap: 8px; max-height: 68vh; overflow: auto; padding-right: 4px; }
        .tree-row {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 10px 12px;
            border-radius: 14px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.04);
            color: #edf4ff;
            text-align: left;
        }
        .tree-row.active { border-color: rgba(79,209,197,0.7); background: rgba(79,209,197,0.08); }
        .kind { display: inline-flex; padding: 4px 8px; border-radius: 999px; font-size: 0.74rem; background: rgba(79,209,197,0.14); color: #7be7dd; }
        .workspace-list { display: grid; gap: 10px; max-height: 34vh; overflow: auto; }
        .workspace-card { padding: 12px; border-radius: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; }
        .workspace-card.active { border-color: rgba(79,209,197,0.7); }
        .scroll-panel { max-height: 40vh; overflow: auto; }
        pre { margin: 0; padding: 14px; border-radius: 14px; background: rgba(6,16,26,0.8); overflow: auto; font-size: 0.85rem; }
        .muted { color: #9db0c7; font-size: 0.88rem; }
        .toast { position: sticky; bottom: 12px; margin-left: auto; width: fit-content; padding: 12px 16px; border-radius: 14px; background: rgba(6,16,26,0.92); border: 1px solid rgba(79,209,197,0.35); }
        @media (max-width: 1320px) { .layout { grid-template-columns: 300px minmax(0, 1fr); } .right { grid-column: 1 / -1; } }
        @media (max-width: 980px) { .hero, .layout { grid-template-columns: 1fr; } .cols, .stats { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { :host { padding: 12px; } .panel, .hero-card { padding: 14px; } }
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
            return;
        }
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
        this.folderForm = emptyFolder(parentId);
    }

    newRequest(parentId = null, kind = 'real') {
        this.selectedItemId = '';
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

    renderTree(parentId = null, depth = 0) {
        const items = (this.selectedCollection?.items || [])
            .filter((item) => (item.parentId || null) === parentId)
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        return items.map((item) => html`
            <div>
                <button class="tree-row ${this.selectedItemId === item.id ? 'active' : ''}" style=${`padding-left:${12 + depth * 18}px`} @click=${() => this.selectItem(item)}>
                    <span class="kind">${item.type === 'folder' ? 'Folder' : item.kind}</span>
                    <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}</span>
                </button>
                ${item.type === 'folder' ? this.renderTree(item.id, depth + 1) : ''}
            </div>
        `);
    }

    renderRequestForm() {
        const form = this.requestForm;
        return html`
            <form @submit=${this.saveRequest}>
                <div class="cols">
                    <label>
                        Name
                        <input name="name" .value=${form.name} @input=${this.updateRequestForm} />
                    </label>
                    <label>
                        Kind
                        <select name="kind" .value=${form.kind} @change=${this.updateRequestForm}>
                            ${REQUEST_KINDS.map((kind) => html`<option value=${kind}>${kind}</option>`)}
                        </select>
                    </label>
                </div>
                <div class="cols">
                    <label>
                        Parent folder
                        <select name="parentId" .value=${form.parentId || ''} @change=${this.updateRequestForm}>
                            <option value="">Root</option>
                            ${(this.selectedCollection?.items || []).filter((item) => item.type === 'folder').map((item) => html`<option value=${item.id}>${item.name}</option>`)}
                        </select>
                    </label>
                    <label>
                        Method
                        <select name="method" .value=${form.method} @change=${this.updateRequestForm}>
                            ${METHODS.map((method) => html`<option value=${method}>${method}</option>`)}
                        </select>
                    </label>
                </div>
                <label>
                    Description
                    <textarea name="description" .value=${form.description} @input=${this.updateRequestForm}></textarea>
                </label>
                ${form.kind === 'real' ? html`
                    <label>
                        Real API URL
                        <input name="url" .value=${form.url} @input=${this.updateRequestForm} placeholder="https://api.example.com/users" />
                    </label>
                ` : html`
                    <div class="cols">
                        <label>
                            Local route path
                            <input name="mockPath" .value=${form.mockPath} @input=${this.updateRequestForm} placeholder="/api/users" />
                        </label>
                        <label>
                            ${form.kind === 'proxy' ? 'Proxy target URL' : 'Status code'}
                            ${form.kind === 'proxy'
                                ? html`<input name="proxyTargetUrl" .value=${form.proxyTargetUrl} @input=${this.updateRequestForm} placeholder="https://api.example.com/users" />`
                                : html`<input name="mockStatusCode" type="number" .value=${String(form.mockStatusCode)} @input=${this.updateRequestForm} />`}
                        </label>
                    </div>
                `}
                ${form.kind !== 'real' ? html`
                    <div class="cols">
                        ${form.kind === 'mock' ? html`
                            <label>
                                Status code
                                <input name="mockStatusCode" type="number" .value=${String(form.mockStatusCode)} @input=${this.updateRequestForm} />
                            </label>
                        ` : ''}
                        <label>
                            Delay ms
                            <input name="mockDelayMs" type="number" .value=${String(form.mockDelayMs)} @input=${this.updateRequestForm} />
                        </label>
                    </div>
                    <label>
                        Response headers
                        <textarea name="responseHeadersText" .value=${form.responseHeadersText} @input=${this.updateRequestForm}></textarea>
                    </label>
                    ${form.kind === 'mock' ? html`
                        <label>
                            Mock template body
                            <textarea name="mockTemplateBody" .value=${form.mockTemplateBody} @input=${this.updateRequestForm}></textarea>
                        </label>
                    ` : ''}
                ` : ''}
                <label>
                    Request headers
                    <textarea name="headersText" .value=${form.headersText} @input=${this.updateRequestForm}></textarea>
                </label>
                <label>
                    Request body
                    <textarea name="body" .value=${form.body} @input=${this.updateRequestForm}></textarea>
                </label>
                <div class="actions">
                    <button type="submit">Save request</button>
                    ${this.selectedRequestItem ? html`<button type="button" class="warn" @click=${() => this.deleteItem(this.selectedRequestItem.id)}>Delete</button>` : ''}
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
                <button @click=${this.saveFolder}>Save folder</button>
                ${this.selectedItem?.type === 'folder' ? html`<button class="warn" @click=${() => this.deleteItem(this.selectedItem.id)}>Delete</button>` : ''}
            </div>
        `;
    }

    render() {
        const collections = this.state.collections || [];
        const selectedCollection = this.selectedCollection;
        const requests = (selectedCollection?.items || []).filter((item) => item.type === 'request');
        const mocks = this.state.mocks || [];
        return html`
            <div class="shell">
                <section class="hero">
                    <div class="hero-card">
                        <div class="kind">Collections + real APIs + mocks + proxy</div>
                        <h1>MockDeck</h1>
                        <p>Organize APIs into collections, folders, and subfolders. Each request can be a real API, a local mock, or a local proxy to another URL. The runner workspace can then use those saved requests as scenario nodes.</p>
                        <div class="actions">
                            <button @click=${this.createCollection}>New collection</button>
                            <a class="btn alt" href=${this.runnerBase}>Open Runner Workspace</a>
                        </div>
                    </div>
                    <div class="stats">
                        <div class="stat"><strong>${collections.length}</strong><span>Collections</span></div>
                        <div class="stat"><strong>${requests.length}</strong><span>Requests in current collection</span></div>
                        <div class="stat"><strong>${mocks.length}</strong><span>Active mock/proxy endpoints</span></div>
                        <div class="stat"><strong>${(selectedCollection?.items || []).filter((item) => item.type === 'folder').length}</strong><span>Folders in current collection</span></div>
                    </div>
                </section>

                <section class="layout">
                    <aside class="panel">
                        <h3>Collections</h3>
                        <p>Collections and workspaces stay visible here. Open one to browse its folders and requests.</p>
                        <div class="workspace-list">
                            ${collections.length ? collections.map((collection) => html`
                                <div class="workspace-card ${this.selectedCollectionId === collection.id ? 'active' : ''}" @click=${() => this.selectCollection(collection.id)}>
                                    <strong>${collection.name}</strong>
                                    <div class="muted">${collection.description || 'No description'}</div>
                                    <div class="muted">${collection.items?.filter((item) => item.type === 'request').length || 0} requests • ${collection.items?.filter((item) => item.type === 'folder').length || 0} folders</div>
                                </div>
                            `) : html`<div class="muted">No collections yet.</div>`}
                        </div>
                        ${selectedCollection ? html`
                            <div class="actions">
                                <button class="alt" @click=${() => this.newFolder(null)}>New root folder</button>
                                <button class="alt" @click=${() => this.newRequest(null, 'real')}>New request</button>
                            </div>
                            <div class="tree" style="margin-top:16px;">
                                ${this.renderTree(null, 0)}
                            </div>
                        ` : ''}
                    </aside>

                    <main class="panel">
                        ${selectedCollection ? html`
                            <h3>Collection Workspace</h3>
                            <p>Use folders to group APIs. Real requests, mocks, and proxies live together in the same tree.</p>
                            <div class="cols">
                                <label>
                                    Collection name
                                    <input name="name" .value=${selectedCollection.name} @input=${this.updateCollectionField} />
                                </label>
                                <label>
                                    Description
                                    <input name="description" .value=${selectedCollection.description || ''} @input=${this.updateCollectionField} />
                                </label>
                            </div>
                            <div class="actions">
                                <button @click=${this.saveCollection}>Save collection</button>
                                <button class="warn" @click=${this.deleteCollection}>Delete collection</button>
                            </div>

                            <div class="panel" style="margin-top:18px;">
                                <h3>${this.selectedItem?.type === 'folder' ? 'Folder Editor' : 'Request Editor'}</h3>
                                <p>${this.selectedItem ? `Editing ${this.selectedItem.name}` : 'Select an existing item or create a new folder/request.'}</p>
                                <div class="actions">
                                    <button class="alt" @click=${() => this.newRequest(this.selectedItem?.type === 'folder' ? this.selectedItem.id : null, 'real')}>New real API</button>
                                    <button class="alt" @click=${() => this.newRequest(this.selectedItem?.type === 'folder' ? this.selectedItem.id : null, 'mock')}>New mock API</button>
                                    <button class="alt" @click=${() => this.newRequest(this.selectedItem?.type === 'folder' ? this.selectedItem.id : null, 'proxy')}>New proxy API</button>
                                    <button class="alt" @click=${() => this.newFolder(this.selectedItem?.type === 'folder' ? this.selectedItem.id : null)}>New subfolder</button>
                                </div>
                                <div style="margin-top:16px;">
                                    ${this.selectedItem?.type === 'folder' ? this.renderFolderForm() : this.renderRequestForm()}
                                </div>
                            </div>
                        ` : html`
                            <h3>No Collection Selected</h3>
                            <p>Create a collection first. Collections are the primary unit now, not one flat global list.</p>
                        `}
                    </main>

                    <section class="right" style="display:grid;gap:18px;">
                        <div class="panel">
                            <h3>Import Requests</h3>
                            <p>Paste a JSON array of request or folder objects to bulk-import real, mock, or proxy APIs into the current collection.</p>
                            <textarea .value=${this.importText} @input=${(event) => { this.importText = event.target.value; }}></textarea>
                            <div class="actions">
                                <button @click=${this.importItems} ?disabled=${!selectedCollection}>Import into collection</button>
                            </div>
                        </div>

                        <div class="panel">
                            <h3>Test Individual API</h3>
                            <p>Trigger any real or local endpoint here. This is the single-request testing surface.</p>
                            <form @submit=${this.sendTrigger}>
                                <div class="cols">
                                    <label>
                                        Method
                                        <select .value=${this.trigger.method} @change=${(event) => { this.trigger = { ...this.trigger, method: event.target.value }; }}>
                                            ${METHODS.filter((method) => method !== 'ANY').map((method) => html`<option value=${method}>${method}</option>`)}
                                        </select>
                                    </label>
                                    <label>
                                        URL
                                        <input .value=${this.trigger.url} @input=${(event) => { this.trigger = { ...this.trigger, url: event.target.value }; }} />
                                    </label>
                                </div>
                                <label>
                                    Headers
                                    <textarea .value=${this.trigger.headersText} @input=${(event) => { this.trigger = { ...this.trigger, headersText: event.target.value }; }}></textarea>
                                </label>
                                <label>
                                    Body
                                    <textarea .value=${this.trigger.body} @input=${(event) => { this.trigger = { ...this.trigger, body: event.target.value }; }}></textarea>
                                </label>
                                <div class="actions">
                                    <button type="submit">Send request</button>
                                </div>
                            </form>
                            ${this.triggerResult ? html`<pre style="margin-top:14px;">${prettyJson(this.triggerResult)}</pre>` : ''}
                        </div>

                        <div class="panel scroll-panel">
                            <h3>Endpoint Inventory</h3>
                            <p>Mock/proxy endpoints that are currently mounted on the local server.</p>
                            ${mocks.length ? html`<pre>${prettyJson(mocks.map((mock) => ({ id: mock.id, name: mock.name, method: mock.method, path: mock.path, type: mock.type })))}</pre>` : html`<div class="muted">No local mock endpoints registered yet.</div>`}
                        </div>
                    </section>
                </section>
            </div>
            ${this.toast ? html`<div class="toast">${this.toast}</div>` : ''}
        `;
    }
}

customElements.define('mockdeck-app', MockDeckApp);
