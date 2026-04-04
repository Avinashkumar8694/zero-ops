import { LitElement, html, css } from 'lit';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY'];
const TYPES = ['json', 'text', 'html', 'xml', 'media', 'proxy'];

function prettyJson(value) {
    if (typeof value === 'string') return value;
    return JSON.stringify(value ?? {}, null, 2);
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

class MdPanel extends LitElement {
    static properties = {
        title: { type: String },
        subtitle: { type: String }
    };

    static styles = css`
        :host { display: block; }
        .panel {
            background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            box-shadow: 0 24px 60px rgba(0,0,0,0.28);
            padding: 18px;
        }
        header { margin-bottom: 14px; }
        h3 { margin: 0; font-size: 1rem; letter-spacing: 0.04em; text-transform: uppercase; }
        p { margin: 6px 0 0; color: #9db0c7; font-size: 0.92rem; }
    `;

    render() {
        return html`
            <section class="panel">
                ${this.title ? html`<header><h3>${this.title}</h3>${this.subtitle ? html`<p>${this.subtitle}</p>` : ''}</header>` : ''}
                <slot></slot>
            </section>
        `;
    }
}
customElements.define('md-panel', MdPanel);

class MdStat extends LitElement {
    static properties = {
        label: { type: String },
        value: { type: String }
    };

    static styles = css`
        .card {
            padding: 14px 16px;
            border-radius: 16px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
        }
        strong { display: block; font-size: 1.5rem; margin-bottom: 6px; }
        span { color: #9db0c7; font-size: 0.9rem; }
    `;

    render() {
        return html`<div class="card"><strong>${this.value}</strong><span>${this.label}</span></div>`;
    }
}
customElements.define('md-stat', MdStat);

class MockDeckApp extends LitElement {
    static properties = {
        apiBase: { state: true },
        uiBase: { state: true },
        state: { state: true },
        form: { state: true },
        trigger: { state: true },
        runnerText: { state: true },
        triggerResult: { state: true },
        runResult: { state: true },
        toast: { state: true }
    };

    static styles = css`
        :host {
            display: block;
            padding: 28px;
            color: #edf4ff;
        }
        .shell {
            max-width: 1500px;
            margin: 0 auto;
            display: grid;
            gap: 20px;
        }
        .hero {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 20px;
            align-items: start;
        }
        .title {
            padding: 22px;
            border-radius: 26px;
            border: 1px solid rgba(255,255,255,0.08);
            background: linear-gradient(135deg, rgba(79,209,197,0.14), rgba(255,255,255,0.03));
            box-shadow: 0 24px 60px rgba(0,0,0,0.24);
        }
        h1 {
            margin: 0 0 12px;
            font-size: clamp(2rem, 4vw, 3.4rem);
            line-height: 0.95;
            letter-spacing: -0.04em;
        }
        .lead {
            margin: 0;
            max-width: 60ch;
            color: #cfe0f6;
            line-height: 1.6;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        .grid {
            display: grid;
            grid-template-columns: 1.1fr 1fr;
            gap: 20px;
        }
        .stack {
            display: grid;
            gap: 20px;
        }
        .actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 18px;
        }
        .btn, button {
            border: 0;
            border-radius: 999px;
            padding: 11px 16px;
            cursor: pointer;
            color: #08111a;
            background: #4fd1c5;
            font-weight: 700;
        }
        .btn.alt, button.alt {
            color: #edf4ff;
            background: rgba(255,255,255,0.08);
        }
        .btn.warn, button.warn {
            background: #fc8181;
        }
        form, .form-grid {
            display: grid;
            gap: 12px;
        }
        .cols {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        label {
            display: grid;
            gap: 7px;
            font-size: 0.92rem;
            color: #cfe0f6;
        }
        input, select, textarea {
            width: 100%;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(6, 16, 26, 0.65);
            color: #edf4ff;
            padding: 12px 14px;
        }
        textarea {
            min-height: 120px;
            resize: vertical;
            font-family: "SFMono-Regular", Menlo, monospace;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.92rem;
        }
        th, td {
            text-align: left;
            padding: 10px 8px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            vertical-align: top;
        }
        .pill {
            display: inline-flex;
            align-items: center;
            padding: 4px 9px;
            border-radius: 999px;
            font-size: 0.8rem;
            background: rgba(79,209,197,0.14);
            color: #7be7dd;
        }
        pre {
            margin: 0;
            padding: 14px;
            border-radius: 14px;
            background: rgba(6, 16, 26, 0.75);
            overflow: auto;
            font-size: 0.86rem;
        }
        .hint { color: #9db0c7; font-size: 0.88rem; }
        .log {
            display: grid;
            gap: 10px;
        }
        .log-item {
            padding: 12px 14px;
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
        @media (max-width: 1080px) {
            .hero, .grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
            :host { padding: 16px; }
            .cols, .stats { grid-template-columns: 1fr; }
        }
    `;

    constructor() {
        super();
        const rawState = JSON.parse(this.dataset.state || '{}');
        this.apiBase = this.dataset.apiBase || '/__mockdeck/api';
        this.uiBase = this.dataset.uiBase || '/__mockdeck';
        this.state = rawState;
        this.form = this.blankForm(rawState.templates || {});
        this.trigger = { method: 'GET', url: 'http://localhost:8381/api/health', headersText: '', body: '' };
        this.runnerText = JSON.stringify([
            { name: 'health', method: 'GET', url: 'http://localhost:8381/api/health' }
        ], null, 2);
        this.triggerResult = null;
        this.runResult = null;
        this.toast = '';
    }

    blankForm(templates) {
        return {
            id: '',
            name: '',
            method: 'GET',
            path: '/api/health',
            type: 'json',
            statusCode: 200,
            delayMs: 0,
            notes: '',
            requestHeadersText: '',
            responseHeadersText: 'content-type: application/json; charset=utf-8',
            templateBody: templates.json || '',
            proxyTargetUrl: '',
            mediaName: '',
            mediaContentType: '',
            mediaBase64: '',
            mediaSize: 0
        };
    }

    async refreshState() {
        this.state = await api(`${this.apiBase}/state`);
    }

    setToast(message) {
        this.toast = message;
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => { this.toast = ''; }, 2600);
    }

    handleTypeChange(type) {
        this.form = {
            ...this.form,
            type,
            templateBody: this.state.templates?.[type] || this.form.templateBody,
            responseHeadersText: type === 'media'
                ? this.form.responseHeadersText
                : `content-type: ${type === 'json' ? 'application/json; charset=utf-8' : type === 'html' ? 'text/html; charset=utf-8' : type === 'xml' ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8'}`
        };
    }

    updateForm(event) {
        const { name, value } = event.target;
        if (name === 'type') return this.handleTypeChange(value);
        this.form = { ...this.form, [name]: value };
    }

    async onMediaPick(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const base64 = await fileToBase64(file);
        this.form = {
            ...this.form,
            mediaName: file.name,
            mediaContentType: file.type || 'application/octet-stream',
            mediaBase64: base64,
            mediaSize: file.size,
            responseHeadersText: `content-type: ${file.type || 'application/octet-stream'}`
        };
    }

    editMock(mock) {
        this.form = {
            id: mock.id,
            name: mock.name,
            method: mock.method,
            path: mock.path,
            type: mock.type,
            statusCode: mock.statusCode,
            delayMs: mock.delayMs,
            notes: mock.notes || '',
            requestHeadersText: textFromObject(mock.requestHeaders),
            responseHeadersText: textFromObject(mock.responseHeaders),
            templateBody: mock.templateBody || '',
            proxyTargetUrl: mock.proxy?.targetUrl || '',
            mediaName: mock.media?.assetName || '',
            mediaContentType: mock.media?.contentType || '',
            mediaBase64: '',
            mediaSize: mock.media?.size || 0
        };
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async saveMock(event) {
        event.preventDefault();
        const payload = {
            id: this.form.id || undefined,
            name: this.form.name,
            method: this.form.method,
            path: this.form.path,
            type: this.form.type,
            statusCode: Number(this.form.statusCode),
            delayMs: Number(this.form.delayMs),
            notes: this.form.notes,
            requestHeaders: objectFromText(this.form.requestHeadersText),
            responseHeaders: objectFromText(this.form.responseHeadersText),
            templateBody: this.form.templateBody,
            proxy: { targetUrl: this.form.proxyTargetUrl }
        };
        if (this.form.type === 'media' && this.form.mediaBase64) {
            payload.media = {
                assetName: this.form.mediaName,
                contentType: this.form.mediaContentType,
                base64: this.form.mediaBase64,
                size: this.form.mediaSize
            };
        }
        await api(`${this.apiBase}/mocks`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        await this.refreshState();
        this.form = this.blankForm(this.state.templates || {});
        this.setToast('Mock saved.');
    }

    async deleteMock(id) {
        await api(`${this.apiBase}/mocks/${id}`, { method: 'DELETE' });
        await this.refreshState();
        this.setToast('Mock deleted.');
    }

    async clearMocks() {
        if (!confirm('Delete all registered mocks?')) return;
        await api(`${this.apiBase}/mocks`, { method: 'DELETE' });
        await this.refreshState();
        this.setToast('All mocks deleted.');
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

    async runCollection() {
        const steps = JSON.parse(this.runnerText);
        this.runResult = await api(`${this.apiBase}/run`, {
            method: 'POST',
            body: JSON.stringify({ steps, stopOnError: false })
        });
    }

    renderFormExtras() {
        if (this.form.type === 'proxy') {
            return html`
                <label>
                    Proxy target URL
                    <input name="proxyTargetUrl" .value=${this.form.proxyTargetUrl} @input=${this.updateForm} placeholder="https://api.example.com" />
                </label>
            `;
        }
        if (this.form.type === 'media') {
            return html`
                <label>
                    Media file
                    <input type="file" @change=${this.onMediaPick} />
                </label>
                <div class="hint">${this.form.mediaName ? `${this.form.mediaName} (${this.form.mediaContentType || 'application/octet-stream'})` : 'Pick a file to serve as mock response media.'}</div>
            `;
        }
        return html`
            <label>
                Template body
                <textarea name="templateBody" .value=${this.form.templateBody} @input=${this.updateForm}></textarea>
            </label>
        `;
    }

    render() {
        const mocks = this.state.mocks || [];
        const logs = this.state.logs || [];
        return html`
            <div class="shell">
                <section class="hero">
                    <div class="title">
                        <div class="pill">UI + CLI mock API workbench</div>
                        <h1>MockDeck</h1>
                        <p class="lead">Register mocks for JSON, text, HTML, XML, media, and proxy flows. Then list, delete, trigger, or run request collections from the same local workspace.</p>
                        <div class="actions">
                            <a class="btn alt" href=${window.location.origin} target="_blank" rel="noreferrer">Open server root</a>
                            <button class="warn" @click=${this.clearMocks}>Delete all mocks</button>
                        </div>
                    </div>
                    <div class="stats">
                        <md-stat label="Registered mocks" value=${String(mocks.length)}></md-stat>
                        <md-stat label="Proxy/media capable" value=${String(mocks.filter((mock) => ['proxy', 'media'].includes(mock.type)).length)}></md-stat>
                        <md-stat label="Recent activity" value=${String(logs.length)}></md-stat>
                        <md-stat label="Runner ready" value="Yes"></md-stat>
                    </div>
                </section>

                <section class="grid">
                    <div class="stack">
                        <md-panel title="Register Mock" subtitle="EJS renders the shell, Lit powers the interactive components, and Handlebars renders your mock payloads.">
                            <form @submit=${this.saveMock}>
                                <div class="cols">
                                    <label>
                                        Name
                                        <input name="name" .value=${this.form.name} @input=${this.updateForm} placeholder="Users list" />
                                    </label>
                                    <label>
                                        Route path
                                        <input name="path" .value=${this.form.path} @input=${this.updateForm} placeholder="/api/users/:id" />
                                    </label>
                                </div>
                                <div class="cols">
                                    <label>
                                        Method
                                        <select name="method" .value=${this.form.method} @change=${this.updateForm}>
                                            ${METHODS.map((method) => html`<option value=${method}>${method}</option>`)}
                                        </select>
                                    </label>
                                    <label>
                                        Type
                                        <select name="type" .value=${this.form.type} @change=${this.updateForm}>
                                            ${TYPES.map((type) => html`<option value=${type}>${type}</option>`)}
                                        </select>
                                    </label>
                                </div>
                                <div class="cols">
                                    <label>
                                        Status
                                        <input name="statusCode" type="number" .value=${String(this.form.statusCode)} @input=${this.updateForm} />
                                    </label>
                                    <label>
                                        Delay ms
                                        <input name="delayMs" type="number" .value=${String(this.form.delayMs)} @input=${this.updateForm} />
                                    </label>
                                </div>
                                <label>
                                    Required request headers
                                    <textarea name="requestHeadersText" .value=${this.form.requestHeadersText} @input=${this.updateForm} placeholder="x-env: qa"></textarea>
                                </label>
                                <label>
                                    Response headers
                                    <textarea name="responseHeadersText" .value=${this.form.responseHeadersText} @input=${this.updateForm}></textarea>
                                </label>
                                ${this.renderFormExtras()}
                                <label>
                                    Notes
                                    <textarea name="notes" .value=${this.form.notes} @input=${this.updateForm} placeholder="Handlebars context has access to request.query, request.body, request.params, and now."></textarea>
                                </label>
                                <div class="actions">
                                    <button type="submit">${this.form.id ? 'Update mock' : 'Save mock'}</button>
                                    <button type="button" class="alt" @click=${() => { this.form = this.blankForm(this.state.templates || {}); }}>Reset</button>
                                </div>
                            </form>
                        </md-panel>

                        <md-panel title="Recent Activity" subtitle="Incoming mock hits and UI-triggered requests are tracked here.">
                            <div class="log">
                                ${logs.length ? logs.map((entry) => html`
                                    <div class="log-item">
                                        <strong>${entry.kind}</strong>
                                        <div>${entry.method || ''} ${entry.path || ''}</div>
                                        <div class="hint">${entry.at}${entry.statusCode ? ` • ${entry.statusCode}` : ''}</div>
                                    </div>
                                `) : html`<div class="hint">No activity yet.</div>`}
                            </div>
                        </md-panel>
                    </div>

                    <div class="stack">
                        <md-panel title="API Catalog" subtitle="Everything registered here is also available from the CLI via list, delete, clear, and add.">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Route</th>
                                        <th>Type</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${mocks.length ? mocks.map((mock) => html`
                                        <tr>
                                            <td>
                                                <strong>${mock.name}</strong>
                                                <div class="hint">${mock.method} • ${mock.statusCode}</div>
                                            </td>
                                            <td><code>${mock.path}</code></td>
                                            <td><span class="pill">${mock.type}</span></td>
                                            <td>
                                                <div class="actions">
                                                    <button class="alt" @click=${() => this.editMock(mock)}>Edit</button>
                                                    <button class="warn" @click=${() => this.deleteMock(mock.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    `) : html`<tr><td colspan="4" class="hint">No mocks registered yet.</td></tr>`}
                                </tbody>
                            </table>
                        </md-panel>

                        <md-panel title="Trigger Request" subtitle="Postman-style single request execution against your mocks or any reachable HTTP endpoint.">
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
                            ${this.triggerResult ? html`<pre>${prettyJson(this.triggerResult)}</pre>` : ''}
                        </md-panel>

                        <md-panel title="Runner" subtitle="Sequential request runner with Handlebars templating between steps using steps.<name>.body or last.body.">
                            <label>
                                Collection JSON
                                <textarea .value=${this.runnerText} @input=${(event) => { this.runnerText = event.target.value; }}></textarea>
                            </label>
                            <div class="actions">
                                <button @click=${this.runCollection}>Run collection</button>
                            </div>
                            ${this.runResult ? html`<pre>${prettyJson(this.runResult)}</pre>` : ''}
                        </md-panel>
                    </div>
                </section>
            </div>
            ${this.toast ? html`<div class="toast">${this.toast}</div>` : ''}
        `;
    }
}

customElements.define('mockdeck-app', MockDeckApp);
