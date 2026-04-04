import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import https from 'https';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import Handlebars from 'handlebars';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..', '..');

const DEFAULT_PORT = 8381;
const UI_BASE = '/__mockdeck';
const UI_API_BASE = `${UI_BASE}/api`;
const RUNNER_BASE = `${UI_BASE}/runner`;
const RUNNER_API_BASE = `${UI_BASE}/api/runner`;
const MAX_LOGS = 150;
const MAX_RUN_EVENTS = 500;
const activeRuns = new Map();

const DEFAULT_TEMPLATES = {
    json: JSON.stringify({
        ok: true,
        mock: '{{mock.name}}',
        method: '{{request.method}}',
        path: '{{request.path}}',
        query: '{{json request.query}}',
        params: '{{json request.params}}',
        now: '{{now}}'
    }, null, 2),
    text: 'Mock "{{mock.name}}" served for {{request.method}} {{request.path}} at {{now}}',
    html: '<section><h1>{{mock.name}}</h1><p>{{request.method}} {{request.path}}</p><pre>{{json request.query}}</pre></section>',
    xml: '<response><name>{{mock.name}}</name><method>{{request.method}}</method><path>{{request.path}}</path><now>{{now}}</now></response>'
};

Handlebars.registerHelper('json', (value) => JSON.stringify(value ?? null));
Handlebars.registerHelper('default', (value, fallback) => (value === undefined || value === null || value === '' ? fallback : value));
Handlebars.registerHelper('uppercase', (value) => String(value ?? '').toUpperCase());
Handlebars.registerHelper('lowercase', (value) => String(value ?? '').toLowerCase());
Handlebars.registerHelper('now', () => new Date().toISOString());

function resolveDataDir() {
    const candidates = [];
    if (process.env.ZERO_OPS_DATA_DIR) candidates.push(path.resolve(process.env.ZERO_OPS_DATA_DIR, 'mockdeck'));
    candidates.push(path.join(os.homedir(), '.zero-ops', 'mockdeck'));
    candidates.push(path.join(PACKAGE_ROOT, '.zero-ops-data', 'mockdeck'));

    for (const candidate of candidates) {
        try {
            fs.mkdirSync(path.join(candidate, 'assets'), { recursive: true });
            return candidate;
        } catch (error) {
            continue;
        }
    }
    throw new Error('Unable to initialize MockDeck storage directory.');
}

function getPaths() {
    const dataDir = resolveDataDir();
    return {
        dataDir,
        storePath: path.join(dataDir, 'store.json'),
        assetDir: path.join(dataDir, 'assets')
    };
}

function defaultStore() {
    return {
        mocks: [],
        collections: [],
        logs: [],
        workflows: [],
        datasets: [],
        settings: { port: DEFAULT_PORT }
    };
}

function ensureStorage() {
    const { dataDir, assetDir, storePath } = getPaths();
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(assetDir, { recursive: true });
    if (!fs.existsSync(storePath)) {
        fs.writeFileSync(storePath, JSON.stringify(defaultStore(), null, 2), 'utf8');
    }
}

function normalizeStoreShape(store) {
    return {
        ...defaultStore(),
        ...store,
        mocks: Array.isArray(store?.mocks) ? store.mocks : [],
        collections: Array.isArray(store?.collections) ? store.collections : [],
        logs: Array.isArray(store?.logs) ? store.logs : [],
        workflows: Array.isArray(store?.workflows) ? store.workflows : [],
        datasets: Array.isArray(store?.datasets) ? store.datasets : [],
        settings: { port: DEFAULT_PORT, ...(store?.settings || {}) }
    };
}

function readStore() {
    ensureStorage();
    const { storePath } = getPaths();
    try {
        return normalizeStoreShape(JSON.parse(fs.readFileSync(storePath, 'utf8')));
    } catch (error) {
        return defaultStore();
    }
}

function writeStore(store) {
    ensureStorage();
    const { storePath } = getPaths();
    fs.writeFileSync(storePath, JSON.stringify(normalizeStoreShape(store), null, 2), 'utf8');
}

function createId(prefix = 'id') {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function trimSlashes(value = '') {
    return String(value).replace(/^\/+|\/+$/g, '');
}

function normalizePathname(value = '/') {
    if (!value) return '/';
    const pathname = String(value).trim();
    if (pathname === '*') return '*';
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function normalizeHeaders(headers = {}) {
    const output = {};
    Object.entries(headers || {}).forEach(([key, value]) => {
        if (key && value !== undefined && value !== null && value !== '') {
            output[String(key).trim().toLowerCase()] = String(value);
        }
    });
    return output;
}

function parseJsonSafe(value, fallback = null) {
    if (value === undefined || value === null || value === '') return fallback;
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function listMocksForDisplay(store) {
    return (store.mocks || []).map((mock) => ({
        id: mock.id,
        name: mock.name,
        method: mock.method,
        path: mock.path,
        type: mock.type,
        statusCode: mock.statusCode,
        enabled: mock.enabled,
        updatedAt: mock.updatedAt
    }));
}

function normalizeMedia(media, existing = null) {
    if (!media) return existing || null;
    return {
        assetName: media.assetName || existing?.assetName || '',
        storedAs: media.storedAs || existing?.storedAs || '',
        contentType: media.contentType || existing?.contentType || 'application/octet-stream',
        size: Number(media.size ?? existing?.size ?? 0)
    };
}

function normalizeMock(input = {}, existing = null) {
    const now = new Date().toISOString();
    const type = (input.type || existing?.type || 'json').toLowerCase();
    const method = (input.method || existing?.method || 'GET').toUpperCase();
    const routePath = normalizePathname(input.path || existing?.path || '/');
    const name = String(input.name || existing?.name || `${method} ${routePath}`).trim();
    const responseHeaders = normalizeHeaders(input.responseHeaders || existing?.responseHeaders || {});
    const requestHeaders = normalizeHeaders(input.requestHeaders || existing?.requestHeaders || {});
    const statusCode = Number(input.statusCode ?? existing?.statusCode ?? 200);
    const delayMs = Number(input.delayMs ?? existing?.delayMs ?? 0);
    const templateBody = input.templateBody ?? existing?.templateBody ?? DEFAULT_TEMPLATES[type] ?? '';

    const mock = {
        id: existing?.id || input.id || createId('mock'),
        name,
        method,
        path: routePath,
        type,
        statusCode: Number.isFinite(statusCode) ? statusCode : 200,
        delayMs: Number.isFinite(delayMs) ? delayMs : 0,
        enabled: input.enabled ?? existing?.enabled ?? true,
        notes: input.notes ?? existing?.notes ?? '',
        requestHeaders,
        responseHeaders,
        templateBody,
        proxy: {
            targetUrl: input.proxy?.targetUrl ?? existing?.proxy?.targetUrl ?? '',
            keepPath: input.proxy?.keepPath ?? existing?.proxy?.keepPath ?? true,
            keepQuery: input.proxy?.keepQuery ?? existing?.proxy?.keepQuery ?? true,
            rewritePath: normalizePathname(input.proxy?.rewritePath ?? existing?.proxy?.rewritePath ?? '')
        },
        media: existing?.media || null,
        createdAt: existing?.createdAt || now,
        updatedAt: now
    };
    if (input.media) {
        mock.media = normalizeMedia(input.media, existing?.media);
    }
    if (type === 'media' && !mock.responseHeaders['content-type']) {
        mock.responseHeaders['content-type'] = mock.media?.contentType || 'application/octet-stream';
    }
    return mock;
}

function saveMediaAsset(mockId, mediaInput) {
    if (!mediaInput?.base64) return null;
    const { assetDir } = getPaths();
    const extension = path.extname(mediaInput.assetName || '') || '';
    const storedAs = `${mockId}${extension}`;
    const outputPath = path.join(assetDir, storedAs);
    fs.writeFileSync(outputPath, Buffer.from(mediaInput.base64, 'base64'));
    return {
        assetName: mediaInput.assetName || storedAs,
        storedAs,
        contentType: mediaInput.contentType || 'application/octet-stream',
        size: Number(mediaInput.size || 0)
    };
}

function sanitizeMockForClient(mock) {
    const { assetDir } = getPaths();
    return {
        ...mock,
        assetExists: mock.media?.storedAs ? fs.existsSync(path.join(assetDir, mock.media.storedAs)) : false
    };
}

function appendLog(store, entry) {
    store.logs = [entry, ...(store.logs || [])].slice(0, MAX_LOGS);
    writeStore(store);
}

function matchRoute(mockPath, requestPath) {
    if (mockPath === '*' || mockPath === '/*') return { matched: true, params: {} };
    const mockSegments = trimSlashes(mockPath).split('/').filter(Boolean);
    const reqSegments = trimSlashes(requestPath).split('/').filter(Boolean);
    if (mockSegments.length !== reqSegments.length) return { matched: false, params: {} };
    const params = {};
    for (let index = 0; index < mockSegments.length; index += 1) {
        const pattern = mockSegments[index];
        const actual = reqSegments[index];
        if (pattern === '*') continue;
        if (pattern.startsWith(':')) {
            params[pattern.slice(1)] = decodeURIComponent(actual);
            continue;
        }
        if (pattern !== actual) return { matched: false, params: {} };
    }
    return { matched: true, params };
}

function findMock(store, method, pathname, headers) {
    const normalizedMethod = String(method || 'GET').toUpperCase();
    const mocks = (store.mocks || []).filter((mock) => mock.enabled !== false);
    for (const mock of mocks) {
        if (mock.method !== 'ANY' && mock.method !== normalizedMethod) continue;
        const match = matchRoute(mock.path, pathname);
        if (!match.matched) continue;
        const requiredHeaders = normalizeHeaders(mock.requestHeaders || {});
        const requestHeaders = normalizeHeaders(headers || {});
        const headersMatch = Object.entries(requiredHeaders).every(([key, value]) => requestHeaders[key] === value);
        if (!headersMatch) continue;
        return { mock, params: match.params };
    }
    return null;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function json(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function notFound(res, message = 'Not found') {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: message }));
}

function getContentTypeForType(type) {
    switch (type) {
        case 'json':
            return 'application/json; charset=utf-8';
        case 'html':
            return 'text/html; charset=utf-8';
        case 'xml':
            return 'application/xml; charset=utf-8';
        case 'text':
            return 'text/plain; charset=utf-8';
        default:
            return 'application/octet-stream';
    }
}

function buildTemplateContext({ mock, req, bodyBuffer, params, parsedUrl, runnerContext }) {
    const rawBody = bodyBuffer.toString('utf8');
    return {
        mock,
        now: new Date().toISOString(),
        runner: runnerContext || {},
        request: {
            method: req.method,
            path: parsedUrl.pathname,
            query: Object.fromEntries(parsedUrl.searchParams.entries()),
            params,
            headers: normalizeHeaders(req.headers),
            body: parseJsonSafe(rawBody, rawBody),
            rawBody
        }
    };
}

function renderTemplate(template, context) {
    try {
        return Handlebars.compile(template || '')(context);
    } catch (error) {
        return `Template error: ${error.message}`;
    }
}

async function performHttpRequest(input) {
    const startedAt = Date.now();
    const targetUrl = new URL(input.url);
    const transport = targetUrl.protocol === 'https:' ? https : http;
    const bodyText = input.body ?? '';
    const bodyBuffer = Buffer.from(bodyText);
    const headers = { ...(input.headers || {}) };
    if (bodyBuffer.length && !headers['content-length']) {
        headers['content-length'] = String(bodyBuffer.length);
    }

    return new Promise((resolve) => {
        const request = transport.request({
            protocol: targetUrl.protocol,
            hostname: targetUrl.hostname,
            port: targetUrl.port || undefined,
            path: `${targetUrl.pathname}${targetUrl.search}`,
            method: input.method || 'GET',
            headers,
            timeout: Number(input.timeoutMs || 15000)
        }, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const text = buffer.toString('utf8');
                resolve({
                    ok: (res.statusCode || 500) < 400,
                    statusCode: res.statusCode || 500,
                    statusMessage: res.statusMessage || '',
                    headers: res.headers,
                    bodyText: text,
                    bodyJson: parseJsonSafe(text, null),
                    durationMs: Date.now() - startedAt
                });
            });
        });

        request.on('timeout', () => request.destroy(new Error('Request timed out')));
        request.on('error', (error) => {
            resolve({
                ok: false,
                statusCode: 599,
                statusMessage: error.message,
                headers: {},
                bodyText: '',
                bodyJson: null,
                durationMs: Date.now() - startedAt
            });
        });

        if (bodyBuffer.length) request.write(bodyBuffer);
        request.end();
    });
}

async function proxyRequest(mock, req, res, bodyBuffer, parsedUrl) {
    if (!mock.proxy?.targetUrl) {
        json(res, 400, { error: 'Proxy targetUrl is missing.' });
        return;
    }
    const targetBase = new URL(mock.proxy.targetUrl);
    const incomingPath = parsedUrl.pathname;
    const nextPath = mock.proxy.keepPath
        ? path.posix.join(targetBase.pathname || '/', incomingPath)
        : (mock.proxy.rewritePath && mock.proxy.rewritePath !== '/' ? mock.proxy.rewritePath : targetBase.pathname || '/');
    const nextSearch = mock.proxy.keepQuery ? parsedUrl.search : '';
    const targetUrl = `${targetBase.protocol}//${targetBase.host}${nextPath}${nextSearch}`;
    const response = await performHttpRequest({
        url: targetUrl,
        method: req.method,
        headers: normalizeHeaders(req.headers),
        body: bodyBuffer.toString('utf8')
    });
    const headers = { ...response.headers, ...mock.responseHeaders };
    res.writeHead(response.statusCode, headers);
    res.end(response.bodyText);
}

async function serveMock(req, res, bodyBuffer, parsedUrl) {
    const store = readStore();
    const liveMatch = findMock(store, req.method, parsedUrl.pathname, req.headers);
    if (!liveMatch) {
        notFound(res, 'Mock not found.');
        return;
    }
    const { mock, params } = liveMatch;
    if (mock.delayMs > 0) await delay(mock.delayMs);

    appendLog(store, {
        id: createId('log'),
        kind: 'mock-hit',
        mockId: mock.id,
        mockName: mock.name,
        method: req.method,
        path: parsedUrl.pathname,
        at: new Date().toISOString()
    });

    if (mock.type === 'proxy') {
        await proxyRequest(mock, req, res, bodyBuffer, parsedUrl);
        return;
    }

    if (mock.type === 'media') {
        const { assetDir } = getPaths();
        const assetPath = mock.media?.storedAs ? path.join(assetDir, mock.media.storedAs) : null;
        if (!assetPath || !fs.existsSync(assetPath)) {
            json(res, 404, { error: 'Media asset not found for this mock.' });
            return;
        }
        res.writeHead(mock.statusCode || 200, {
            'Content-Type': mock.media?.contentType || 'application/octet-stream',
            ...mock.responseHeaders
        });
        fs.createReadStream(assetPath).pipe(res);
        return;
    }

    const context = buildTemplateContext({ mock, req, bodyBuffer, params, parsedUrl });
    const rendered = renderTemplate(mock.templateBody, context);
    res.writeHead(mock.statusCode || 200, {
        'Content-Type': mock.responseHeaders['content-type'] || getContentTypeForType(mock.type),
        ...mock.responseHeaders
    });
    res.end(rendered);
}

function openBrowser(url) {
    const platform = process.platform;
    const command = platform === 'darwin'
        ? `open "${url}"`
        : platform === 'win32'
            ? `start "" "${url}"`
            : `xdg-open "${url}"`;
    exec(command, () => {});
}

function readCliBody(options) {
    if (options.bodyFile) return fs.readFileSync(path.resolve(options.bodyFile), 'utf8');
    return options.body || '';
}

function parseKeyValuePairs(values = []) {
    const output = {};
    for (const pair of values) {
        const index = pair.indexOf(':');
        if (index > 0) {
            const key = pair.slice(0, index).trim();
            const value = pair.slice(index + 1).trim();
            if (key) output[key.toLowerCase()] = value;
        }
    }
    return output;
}

function resolveVendorPath(requestPath) {
    const relativePath = requestPath.replace('/vendor/', '');
    const fullPath = path.join(PACKAGE_ROOT, 'node_modules', relativePath);
    const normalized = path.normalize(fullPath);
    const nodeModulesRoot = path.join(PACKAGE_ROOT, 'node_modules');
    if (!normalized.startsWith(nodeModulesRoot)) return null;
    return normalized;
}

function getMimeType(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.js' || extension === '.mjs') return 'application/javascript; charset=utf-8';
    if (extension === '.css') return 'text/css; charset=utf-8';
    if (extension === '.json') return 'application/json; charset=utf-8';
    if (extension === '.svg') return 'image/svg+xml';
    if (extension === '.map') return 'application/json; charset=utf-8';
    if (extension === '.md') return 'text/markdown; charset=utf-8';
    return 'application/octet-stream';
}

function getValueAtPath(source, valuePath) {
    if (!valuePath) return source;
    return String(valuePath)
        .split('.')
        .filter(Boolean)
        .reduce((acc, segment) => (acc === undefined || acc === null ? undefined : acc[segment]), source);
}

function setValueAtPath(target, valuePath, value) {
    const segments = String(valuePath || '').split('.').filter(Boolean);
    if (!segments.length) return;
    let ref = target;
    for (let index = 0; index < segments.length - 1; index += 1) {
        const key = segments[index];
        if (typeof ref[key] !== 'object' || ref[key] === null) ref[key] = {};
        ref = ref[key];
    }
    ref[segments[segments.length - 1]] = value;
}

function inferDatasetKind(fileName = '') {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.csv') return 'csv';
    if (ext === '.xlsx' || ext === '.xls') return 'excel';
    return 'table';
}

function parseDataset(fileName, base64) {
    const buffer = Buffer.from(base64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    return {
        headers: rows.length ? Object.keys(rows[0]) : [],
        rows,
        sheetName,
        kind: inferDatasetKind(fileName)
    };
}

function sanitizeDataset(dataset) {
    return {
        id: dataset.id,
        name: dataset.name,
        fileName: dataset.fileName,
        kind: dataset.kind,
        rowCount: dataset.rows?.length || 0,
        headers: dataset.headers || [],
        sheetName: dataset.sheetName || '',
        createdAt: dataset.createdAt
    };
}

function normalizeCollectionItem(input = {}, existing = null) {
    const kind = input.kind || existing?.kind || 'folder';
    const type = input.type || existing?.type || 'folder';
    return {
        id: existing?.id || input.id || createId(type === 'folder' ? 'folder' : 'req'),
        type,
        kind,
        parentId: input.parentId ?? existing?.parentId ?? null,
        name: input.name || existing?.name || (type === 'folder' ? 'New Folder' : 'New Request'),
        description: input.description ?? existing?.description ?? '',
        method: String(input.method || existing?.method || 'GET').toUpperCase(),
        url: input.url ?? existing?.url ?? '',
        mockId: input.mockId ?? existing?.mockId ?? '',
        folderColor: input.folderColor ?? existing?.folderColor ?? '',
        headers: normalizeHeaders(input.headers || existing?.headers || {}),
        body: input.body ?? existing?.body ?? '',
        mockConfig: input.mockConfig ?? existing?.mockConfig ?? {
            path: '/api/example',
            statusCode: 200,
            delayMs: 0,
            templateBody: DEFAULT_TEMPLATES.json,
            responseHeaders: {},
            proxyTargetUrl: ''
        }
    };
}

function normalizeCollection(input = {}, existing = null) {
    const now = new Date().toISOString();
    return {
        id: existing?.id || input.id || createId('collection'),
        name: input.name || existing?.name || 'New Collection',
        description: input.description ?? existing?.description ?? '',
        items: Array.isArray(input.items)
            ? input.items.map((item) => normalizeCollectionItem(item))
            : (existing?.items || []).map((item) => normalizeCollectionItem(item)),
        createdAt: existing?.createdAt || now,
        updatedAt: now
    };
}

function sanitizeCollection(collection) {
    return {
        ...collection,
        requestCount: (collection.items || []).filter((item) => item.type === 'request').length,
        folderCount: (collection.items || []).filter((item) => item.type === 'folder').length
    };
}

function flattenCollectionRequests(store) {
    return (store.collections || []).flatMap((collection) =>
        (collection.items || [])
            .filter((item) => item.type === 'request')
            .map((item) => ({ ...item, collectionId: collection.id, collectionName: collection.name }))
    );
}

function deleteMockById(store, mockId) {
    const target = (store.mocks || []).find((mock) => mock.id === mockId);
    if (target) deleteMediaAssetIfNeeded(target);
    store.mocks = (store.mocks || []).filter((mock) => mock.id !== mockId);
}

function syncCollectionRequestToMock(store, item, existingItem = null) {
    if (item.type !== 'request') return item;
    if (item.kind === 'real') {
        if (existingItem?.mockId) deleteMockById(store, existingItem.mockId);
        return { ...item, mockId: '' };
    }

    const mockExisting = item.mockId ? (store.mocks || []).find((mock) => mock.id === item.mockId) : null;
    const mockInput = {
        id: mockExisting?.id || item.mockId || existingItem?.mockId || undefined,
        name: item.name,
        method: item.method,
        path: item.mockConfig?.path || '/api/example',
        type: item.kind === 'proxy' ? 'proxy' : 'json',
        statusCode: Number(item.mockConfig?.statusCode ?? 200),
        delayMs: Number(item.mockConfig?.delayMs ?? 0),
        responseHeaders: normalizeHeaders(item.mockConfig?.responseHeaders || {}),
        templateBody: item.mockConfig?.templateBody || DEFAULT_TEMPLATES.json,
        proxy: {
            targetUrl: item.kind === 'proxy' ? (item.mockConfig?.proxyTargetUrl || '') : ''
        }
    };
    const normalizedMock = normalizeMock(mockInput, mockExisting);
    const existingIndex = (store.mocks || []).findIndex((mock) => mock.id === normalizedMock.id);
    if (existingIndex >= 0) store.mocks[existingIndex] = normalizedMock;
    else store.mocks.unshift(normalizedMock);
    return {
        ...item,
        mockId: normalizedMock.id,
        url: item.kind === 'real' ? item.url : '',
        mockConfig: {
            ...item.mockConfig,
            path: normalizedMock.path,
            statusCode: normalizedMock.statusCode,
            delayMs: normalizedMock.delayMs,
            responseHeaders: normalizedMock.responseHeaders,
            templateBody: normalizedMock.templateBody,
            proxyTargetUrl: normalizedMock.proxy?.targetUrl || ''
        }
    };
}

function getCollectionItemDescendants(items, rootId) {
    const result = new Set([rootId]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const item of items) {
            if (item.parentId && result.has(item.parentId) && !result.has(item.id)) {
                result.add(item.id);
                changed = true;
            }
        }
    }
    return result;
}

function normalizeMapping(mapping = {}, index = 0) {
    return {
        id: mapping.id || createId(`map${index}`),
        sourceType: mapping.sourceType || 'step',
        sourceNodeId: mapping.sourceNodeId || '',
        sourcePath: mapping.sourcePath || '',
        targetType: mapping.targetType || 'header',
        targetKey: mapping.targetKey || ''
    };
}

function normalizeWorkflowNode(node = {}, index = 0) {
    const nodeType = node.nodeType || (index === 0 ? 'start' : 'request');
    return {
        id: node.id || createId(`node${index + 1}`),
        nodeType,
        name: node.name || (nodeType === 'start' ? 'Start' : `Node ${index + 1}`),
        x: Number(node.x ?? (nodeType === 'start' ? 80 : 320 + (index - 1) * 240)),
        y: Number(node.y ?? 80),
        enabled: node.enabled ?? true,
        method: String(node.method || 'GET').toUpperCase(),
        url: node.url || '',
        mockId: node.mockId || '',
        requestRef: node.requestRef || { collectionId: '', itemId: '' },
        timeoutMs: Number(node.timeoutMs ?? 15000),
        headers: normalizeHeaders(node.headers || {}),
        body: node.body || '',
        dependsOn: Array.isArray(node.dependsOn) ? node.dependsOn.filter(Boolean) : [],
        mappings: Array.isArray(node.mappings) ? node.mappings.map(normalizeMapping) : [],
        useGlobalHeaders: node.useGlobalHeaders ?? true,
        preScript: node.preScript || '',
        postScript: node.postScript || '',
        notes: node.notes || ''
    };
}

function normalizeWorkflow(input = {}, existing = null) {
    const now = new Date().toISOString();
    const rawNodes = Array.isArray(input.nodes)
        ? input.nodes.map(normalizeWorkflowNode)
        : (existing?.nodes || []).map(normalizeWorkflowNode);
    const hasStartNode = rawNodes.some((node) => node.nodeType === 'start');
    const nodes = hasStartNode ? rawNodes : [normalizeWorkflowNode({ nodeType: 'start', name: 'Start', x: 80, y: 240 }, 0), ...rawNodes];
    return {
        id: existing?.id || input.id || createId('workflow'),
        name: input.name || existing?.name || 'Untitled workflow',
        description: input.description ?? existing?.description ?? '',
        datasetId: input.datasetId ?? existing?.datasetId ?? '',
        globals: {
            headers: normalizeHeaders(input.globals?.headers ?? existing?.globals?.headers ?? {}),
            iterations: Number(input.globals?.iterations ?? existing?.globals?.iterations ?? 1),
            concurrency: Number(input.globals?.concurrency ?? existing?.globals?.concurrency ?? 1),
            timeoutMs: Number(input.globals?.timeoutMs ?? existing?.globals?.timeoutMs ?? 15000),
            stopOnError: input.globals?.stopOnError ?? existing?.globals?.stopOnError ?? false
        },
        nodes,
        createdAt: existing?.createdAt || now,
        updatedAt: now
    };
}

function sanitizeWorkflow(workflow) {
    return {
        ...workflow,
        nodeCount: workflow.nodes?.length || 0
    };
}

function getMockUrl(mock, baseOrigin) {
    return mock ? `${baseOrigin}${mock.path}` : '';
}

function buildRunnerState(store, baseOrigin) {
    return {
        mocks: (store.mocks || []).map(sanitizeMockForClient),
        collections: (store.collections || []).map(sanitizeCollection),
        collectionRequests: flattenCollectionRequests(store),
        workflows: (store.workflows || []).map(sanitizeWorkflow),
        datasets: (store.datasets || []).map(sanitizeDataset),
        recentRuns: Array.from(activeRuns.values()).map((run) => sanitizeRun(run)),
        baseOrigin
    };
}

function topoSortNodes(nodes) {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const visited = new Set();
    const visiting = new Set();
    const ordered = [];

    function visit(node) {
        if (visited.has(node.id)) return;
        if (visiting.has(node.id)) throw new Error(`Workflow cycle detected around node "${node.name}".`);
        visiting.add(node.id);
        for (const dependencyId of node.dependsOn || []) {
            const dependencyNode = nodeMap.get(dependencyId);
            if (dependencyNode) visit(dependencyNode);
        }
        visiting.delete(node.id);
        visited.add(node.id);
        ordered.push(node);
    }

    nodes.forEach(visit);
    return ordered;
}

function createScriptHelpers() {
    return {
        get: getValueAtPath,
        set: setValueAtPath,
        assert(condition, message = 'Assertion failed.') {
            if (!condition) throw new Error(message);
        }
    };
}

function runUserScript(script, ctx) {
    if (!script || !String(script).trim()) return {};
    const helpers = createScriptHelpers();
    const executor = new Function('ctx', 'helpers', `
        "use strict";
        ${script}
    `);
    const result = executor(ctx, helpers);
    return result && typeof result === 'object' ? result : {};
}

function applyMappings(node, runtimeContext, requestState) {
    for (const mapping of node.mappings || []) {
        let sourceValue;
        if (mapping.sourceType === 'row') {
            sourceValue = getValueAtPath(runtimeContext.row, mapping.sourcePath);
        } else if (mapping.sourceType === 'global') {
            sourceValue = getValueAtPath(runtimeContext.globalVars, mapping.sourcePath);
        } else {
            const sourceStep = runtimeContext.steps[mapping.sourceNodeId];
            sourceValue = getValueAtPath(sourceStep, mapping.sourcePath);
        }
        if (sourceValue === undefined) continue;

        if (mapping.targetType === 'header' && mapping.targetKey) {
            requestState.headers[String(mapping.targetKey).toLowerCase()] = String(sourceValue);
        } else if (mapping.targetType === 'query' && mapping.targetKey) {
            requestState.url.searchParams.set(mapping.targetKey, String(sourceValue));
        } else if (mapping.targetType === 'var' && mapping.targetKey) {
            runtimeContext.globalVars[mapping.targetKey] = sourceValue;
        } else if (mapping.targetType === 'bodyField' && mapping.targetKey) {
            setValueAtPath(requestState.bodyObject, mapping.targetKey, sourceValue);
        }
    }
}

function mergeScriptResult(requestState, runtimeContext, result) {
    if (!result || typeof result !== 'object') return;
    if (result.url) requestState.url = new URL(String(result.url));
    if (result.headers && typeof result.headers === 'object') {
        Object.assign(requestState.headers, normalizeHeaders(result.headers));
    }
    if (result.vars && typeof result.vars === 'object') {
        Object.assign(runtimeContext.globalVars, result.vars);
    }
    if (result.body !== undefined) {
        if (typeof result.body === 'object') {
            requestState.bodyObject = result.body;
            requestState.bodyText = JSON.stringify(result.body);
        } else {
            requestState.bodyText = String(result.body);
            requestState.bodyObject = parseJsonSafe(requestState.bodyText, requestState.bodyObject);
        }
    }
}

function resolveNodeRequestSource(node, baseOrigin, mockLookup, requestLookup) {
    const requestItem = node.requestRef?.itemId ? requestLookup.get(node.requestRef.itemId) : null;
    const effectiveMockId = node.mockId || requestItem?.mockId || '';
    const effectiveMethod = requestItem?.method || node.method || 'GET';
    let effectiveUrl = node.url || requestItem?.url || '';

    if (!effectiveUrl && effectiveMockId && mockLookup.has(effectiveMockId)) {
        effectiveUrl = getMockUrl(mockLookup.get(effectiveMockId), baseOrigin);
    }
    return { effectiveMethod, effectiveUrl, effectiveMockId, requestItem };
}

function renderNodeUrl(node, runtimeContext, baseOrigin, mockLookup, requestLookup) {
    const source = resolveNodeRequestSource(node, baseOrigin, mockLookup, requestLookup);
    if (source.effectiveUrl) return renderTemplate(source.effectiveUrl, runtimeContext.templateContext);
    if (source.effectiveMockId && mockLookup.has(source.effectiveMockId)) {
        return getMockUrl(mockLookup.get(source.effectiveMockId), baseOrigin);
    }
    throw new Error(`Node "${node.name}" is missing a URL or linked mock.`);
}

function computePercentile(values, percentile) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.floor(percentile * (sorted.length - 1)));
    return sorted[index];
}

function finalizeRunAnalytics(run) {
    const completed = run.events.filter((event) => event.kind === 'node-complete');
    const durations = completed.map((event) => event.durationMs);
    const byNode = {};
    for (const event of completed) {
        if (!byNode[event.nodeId]) {
            byNode[event.nodeId] = { nodeName: event.nodeName, requests: 0, success: 0, failure: 0, durations: [] };
        }
        const bucket = byNode[event.nodeId];
        bucket.requests += 1;
        if (event.ok) bucket.success += 1;
        else bucket.failure += 1;
        bucket.durations.push(event.durationMs);
    }

    const nodeMetrics = Object.entries(byNode).map(([nodeId, metric]) => ({
        nodeId,
        nodeName: metric.nodeName,
        requests: metric.requests,
        success: metric.success,
        failure: metric.failure,
        avgMs: metric.requests ? Math.round(metric.durations.reduce((sum, item) => sum + item, 0) / metric.requests) : 0,
        p95Ms: Math.round(computePercentile(metric.durations, 0.95))
    }));

    const totalDurationMs = run.startedAt && run.finishedAt
        ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
        : 0;
    run.summary = {
        scenariosTotal: run.progress.scenariosTotal,
        scenariosCompleted: run.progress.scenariosCompleted,
        requests: completed.length,
        success: completed.filter((event) => event.ok).length,
        failure: completed.filter((event) => !event.ok).length,
        avgMs: durations.length ? Math.round(durations.reduce((sum, item) => sum + item, 0) / durations.length) : 0,
        p95Ms: Math.round(computePercentile(durations, 0.95)),
        throughputPerSec: totalDurationMs > 0 ? Number((completed.length / (totalDurationMs / 1000)).toFixed(2)) : 0,
        totalDurationMs,
        nodeMetrics
    };
}

function sanitizeRun(run) {
    return {
        id: run.id,
        workflowId: run.workflowId,
        workflowName: run.workflowName,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt || null,
        progress: run.progress,
        summary: run.summary,
        events: run.events.slice(-120),
        error: run.error || null
    };
}

function pushRunEvent(run, event) {
    run.events.push({ id: createId('event'), at: new Date().toISOString(), ...event });
    if (run.events.length > MAX_RUN_EVENTS) run.events = run.events.slice(-MAX_RUN_EVENTS);
}

async function executeWorkflowRun(run, workflow, store, options = {}) {
    const baseOrigin = options.baseOrigin || `http://127.0.0.1:${store.settings?.port || DEFAULT_PORT}`;
    const orderedNodes = topoSortNodes((workflow.nodes || []).filter((node) => node.enabled !== false));
    const executableNodes = orderedNodes.filter((node) => node.nodeType !== 'start');
    const dataset = (store.datasets || []).find((item) => item.id === workflow.datasetId);
    const dataRows = dataset?.rows?.length ? dataset.rows : [{}];
    const iterations = Math.max(1, Number(workflow.globals?.iterations || 1));
    const scenarios = [];
    for (let iteration = 0; iteration < iterations; iteration += 1) {
        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
            scenarios.push({
                iteration: iteration + 1,
                rowIndex,
                row: dataRows[rowIndex] || {}
            });
        }
    }

    run.progress.scenariosTotal = scenarios.length;
    run.progress.nodeTotal = scenarios.length * executableNodes.length;

    const concurrency = Math.max(1, Number(workflow.globals?.concurrency || 1));
    const mockLookup = new Map((store.mocks || []).map((mock) => [mock.id, mock]));
    const requestLookup = new Map(flattenCollectionRequests(store).map((item) => [item.id, item]));

    let cursor = 0;
    async function workerLoop() {
        while (cursor < scenarios.length) {
            const scenario = scenarios[cursor];
            cursor += 1;
            await executeScenario(scenario);
        }
    }

    const executeScenario = async (scenario) => {
        const runtimeContext = {
            row: scenario.row,
            iteration: scenario.iteration,
            steps: {},
            globalVars: {},
            templateContext: {
                row: scenario.row,
                iteration: scenario.iteration,
                datasetRowIndex: scenario.rowIndex,
                steps: {},
                last: null,
                globals: {},
                vars: {},
                now: new Date().toISOString()
            }
        };

        pushRunEvent(run, {
            kind: 'scenario-start',
            scenarioKey: `${scenario.iteration}:${scenario.rowIndex}`,
            iteration: scenario.iteration,
            rowIndex: scenario.rowIndex
        });

        for (const node of orderedNodes) {
            if (node.nodeType === 'start') {
                runtimeContext.steps[node.id] = {
                    nodeId: node.id,
                    nodeName: node.name,
                    response: { ok: true, statusCode: 0, headers: {}, body: null, durationMs: 0 }
                };
                runtimeContext.templateContext.steps = runtimeContext.steps;
                runtimeContext.templateContext.last = runtimeContext.steps[node.id];
                pushRunEvent(run, {
                    kind: 'node-complete',
                    scenarioKey: `${scenario.iteration}:${scenario.rowIndex}`,
                    nodeId: node.id,
                    nodeName: node.name,
                    statusCode: 0,
                    durationMs: 0,
                    ok: true,
                    message: 'Start node'
                });
                continue;
            }
            const source = resolveNodeRequestSource(node, baseOrigin, mockLookup, requestLookup);
            const requestState = {
                url: new URL(renderNodeUrl(node, runtimeContext, baseOrigin, mockLookup, requestLookup)),
                headers: node.useGlobalHeaders ? { ...workflow.globals.headers } : {},
                bodyText: renderTemplate((node.body || source.requestItem?.body || ''), runtimeContext.templateContext),
                bodyObject: parseJsonSafe(renderTemplate((node.body || source.requestItem?.body || ''), runtimeContext.templateContext), {})
            };
            Object.assign(requestState.headers, normalizeHeaders(source.requestItem?.headers || {}));
            Object.assign(requestState.headers, normalizeHeaders(node.headers || {}));
            applyMappings(node, runtimeContext, requestState);

            const preResult = runUserScript(node.preScript, {
                workflow,
                node,
                scenario,
                row: scenario.row,
                request: { url: String(requestState.url), headers: { ...requestState.headers }, body: requestState.bodyText },
                steps: runtimeContext.steps,
                globals: runtimeContext.globalVars
            });
            mergeScriptResult(requestState, runtimeContext, preResult);
            if (requestState.bodyObject && Object.keys(requestState.bodyObject).length && (!requestState.bodyText || requestState.bodyText === '{}')) {
                requestState.bodyText = JSON.stringify(requestState.bodyObject);
            }

            pushRunEvent(run, {
                kind: 'node-start',
                scenarioKey: `${scenario.iteration}:${scenario.rowIndex}`,
                nodeId: node.id,
                nodeName: node.name,
                method: source.effectiveMethod,
                url: String(requestState.url)
            });

            const response = await performHttpRequest({
                url: String(requestState.url),
                method: source.effectiveMethod,
                headers: requestState.headers,
                body: requestState.bodyText,
                timeoutMs: node.timeoutMs || workflow.globals.timeoutMs
            });

            runtimeContext.steps[node.id] = {
                nodeId: node.id,
                nodeName: node.name,
                request: { url: String(requestState.url), method: source.effectiveMethod, headers: requestState.headers, body: requestState.bodyText },
                response: {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: response.bodyJson ?? response.bodyText,
                    ok: response.ok,
                    durationMs: response.durationMs
                }
            };
            runtimeContext.templateContext.steps = runtimeContext.steps;
            runtimeContext.templateContext.last = runtimeContext.steps[node.id];
            runtimeContext.templateContext.globals = runtimeContext.globalVars;
            runtimeContext.templateContext.vars = runtimeContext.globalVars;

            try {
                const postResult = runUserScript(node.postScript, {
                    workflow,
                    node,
                    scenario,
                    row: scenario.row,
                    request: runtimeContext.steps[node.id].request,
                    response: runtimeContext.steps[node.id].response,
                    steps: runtimeContext.steps,
                    globals: runtimeContext.globalVars
                });
                if (postResult?.assert === false) {
                    throw new Error(postResult.message || `Post script assertion failed on node "${node.name}".`);
                }
                mergeScriptResult(requestState, runtimeContext, postResult);
            } catch (error) {
                response.ok = false;
                response.statusMessage = error.message;
            }

            run.progress.nodeCompleted += 1;
            pushRunEvent(run, {
                kind: 'node-complete',
                scenarioKey: `${scenario.iteration}:${scenario.rowIndex}`,
                nodeId: node.id,
                nodeName: node.name,
                statusCode: response.statusCode,
                durationMs: response.durationMs,
                ok: response.ok,
                message: response.statusMessage
            });

            if (!response.ok && workflow.globals.stopOnError) break;
        }

        run.progress.scenariosCompleted += 1;
        pushRunEvent(run, {
            kind: 'scenario-complete',
            scenarioKey: `${scenario.iteration}:${scenario.rowIndex}`,
            iteration: scenario.iteration,
            rowIndex: scenario.rowIndex
        });
    };

    await Promise.all(Array.from({ length: concurrency }, () => workerLoop()));
}

function createRun(workflow) {
    return {
        id: createId('run'),
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'running',
        startedAt: new Date().toISOString(),
        finishedAt: null,
        progress: {
            scenariosTotal: 0,
            scenariosCompleted: 0,
            nodeTotal: 0,
            nodeCompleted: 0
        },
        events: [],
        summary: null,
        error: null
    };
}

function startWorkflowRun(workflow, store, options = {}) {
    const run = createRun(workflow);
    activeRuns.set(run.id, run);

    executeWorkflowRun(run, workflow, store, options)
        .then(() => {
            run.status = 'completed';
            run.finishedAt = new Date().toISOString();
            finalizeRunAnalytics(run);
        })
        .catch((error) => {
            run.status = 'failed';
            run.finishedAt = new Date().toISOString();
            run.error = error.message;
            finalizeRunAnalytics(run);
        });

    return run;
}

function deleteMediaAssetIfNeeded(mock) {
    if (!mock?.media?.storedAs) return;
    const { assetDir } = getPaths();
    const assetPath = path.join(assetDir, mock.media.storedAs);
    if (fs.existsSync(assetPath)) fs.unlinkSync(assetPath);
}

function renderPage(viewName, payload) {
    const viewPath = path.join(__dirname, 'views', viewName);
    return ejs.renderFile(viewPath, payload);
}

async function startServer(port) {
    ensureStorage();
    const publicDir = path.join(__dirname, 'public');
    const host = '127.0.0.1';

    const server = http.createServer(async (req, res) => {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const baseOrigin = `http://${host}:${port}`;

        if (req.method === 'GET' && parsedUrl.pathname === '/') {
            res.writeHead(302, { Location: UI_BASE });
            res.end();
            return;
        }

        if (req.method === 'GET' && parsedUrl.pathname === UI_BASE) {
            const store = readStore();
            const html = await renderPage('index.ejs', {
                uiBase: UI_BASE,
                apiBase: UI_API_BASE,
                runnerBase: RUNNER_BASE,
                initialState: JSON.stringify({
                    mocks: (store.mocks || []).map(sanitizeMockForClient),
                    collections: (store.collections || []).map(sanitizeCollection),
                    logs: store.logs || [],
                    templates: DEFAULT_TEMPLATES
                })
            });
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }

        if (req.method === 'GET' && parsedUrl.pathname === RUNNER_BASE) {
            const store = readStore();
            const html = await renderPage('runner.ejs', {
                uiBase: UI_BASE,
                runnerBase: RUNNER_BASE,
                runnerApiBase: RUNNER_API_BASE,
                initialState: JSON.stringify(buildRunnerState(store, baseOrigin))
            });
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }

        if (req.method === 'GET' && parsedUrl.pathname.startsWith(`${UI_BASE}/public/`)) {
            const filePath = path.join(publicDir, parsedUrl.pathname.replace(`${UI_BASE}/public/`, ''));
            if (!fs.existsSync(filePath)) {
                notFound(res);
                return;
            }
            res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
            fs.createReadStream(filePath).pipe(res);
            return;
        }

        if (req.method === 'GET' && parsedUrl.pathname.startsWith('/vendor/')) {
            const filePath = resolveVendorPath(parsedUrl.pathname);
            if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                notFound(res);
                return;
            }
            res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
            fs.createReadStream(filePath).pipe(res);
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/state` && req.method === 'GET') {
            const store = readStore();
            json(res, 200, {
                mocks: (store.mocks || []).map(sanitizeMockForClient),
                collections: store.collections || [],
                collectionSummaries: (store.collections || []).map(sanitizeCollection),
                logs: store.logs || [],
                templates: DEFAULT_TEMPLATES
            });
            return;
        }

        if (parsedUrl.pathname === `${RUNNER_API_BASE}/state` && req.method === 'GET') {
            const store = readStore();
            json(res, 200, buildRunnerState(store, baseOrigin));
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/mocks` && req.method === 'GET') {
            const store = readStore();
            json(res, 200, { mocks: (store.mocks || []).map(sanitizeMockForClient) });
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/collections` && req.method === 'GET') {
            const store = readStore();
            json(res, 200, { collections: store.collections || [], summaries: (store.collections || []).map(sanitizeCollection) });
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/collections` && req.method === 'POST') {
            const body = await collectRequestBody(req);
            const payload = parseJsonSafe(body.toString('utf8'), {});
            const store = readStore();
            const existingIndex = store.collections.findIndex((collection) => collection.id === payload.id);
            const existing = existingIndex >= 0 ? store.collections[existingIndex] : null;
            const normalized = normalizeCollection(payload, existing);
            if (existingIndex >= 0) store.collections[existingIndex] = normalized;
            else store.collections.unshift(normalized);
            writeStore(store);
            json(res, 200, { collection: sanitizeCollection(normalized) });
            return;
        }

        if (parsedUrl.pathname.startsWith(`${UI_API_BASE}/collections/`) && !parsedUrl.pathname.includes('/items') && req.method === 'DELETE') {
            const collectionId = parsedUrl.pathname.replace(`${UI_API_BASE}/collections/`, '');
            const store = readStore();
            const collection = store.collections.find((item) => item.id === collectionId);
            if (!collection) return notFound(res, 'Collection not found.');
            for (const item of collection.items || []) {
                if (item.mockId) deleteMockById(store, item.mockId);
            }
            store.collections = store.collections.filter((item) => item.id !== collectionId);
            writeStore(store);
            json(res, 200, { success: true });
            return;
        }

        if (parsedUrl.pathname.match(new RegExp(`^${UI_API_BASE}/collections/[^/]+/items$`)) && req.method === 'POST') {
            const collectionId = parsedUrl.pathname.split('/').slice(-2)[0];
            const body = await collectRequestBody(req);
            const payload = parseJsonSafe(body.toString('utf8'), {});
            const store = readStore();
            const collectionIndex = store.collections.findIndex((item) => item.id === collectionId);
            if (collectionIndex < 0) return notFound(res, 'Collection not found.');
            const collection = store.collections[collectionIndex];
            const existingItemIndex = (collection.items || []).findIndex((item) => item.id === payload.id);
            const existingItem = existingItemIndex >= 0 ? collection.items[existingItemIndex] : null;
            let normalizedItem = normalizeCollectionItem(payload, existingItem);
            normalizedItem = syncCollectionRequestToMock(store, normalizedItem, existingItem);
            const nextCollection = {
                ...collection,
                items: existingItemIndex >= 0
                    ? collection.items.map((item, index) => index === existingItemIndex ? normalizedItem : item)
                    : [normalizedItem, ...(collection.items || [])],
                updatedAt: new Date().toISOString()
            };
            store.collections[collectionIndex] = nextCollection;
            writeStore(store);
            json(res, 200, { collection: sanitizeCollection(nextCollection), item: normalizedItem });
            return;
        }

        if (parsedUrl.pathname.match(new RegExp(`^${UI_API_BASE}/collections/[^/]+/items/import$`)) && req.method === 'POST') {
            const collectionId = parsedUrl.pathname.split('/').slice(-3)[0];
            const body = await collectRequestBody(req);
            const payload = parseJsonSafe(body.toString('utf8'), {});
            const store = readStore();
            const collectionIndex = store.collections.findIndex((item) => item.id === collectionId);
            if (collectionIndex < 0) return notFound(res, 'Collection not found.');
            const collection = store.collections[collectionIndex];
            const importedItems = Array.isArray(payload.items) ? payload.items : [];
            const normalizedItems = importedItems.map((item) => syncCollectionRequestToMock(store, normalizeCollectionItem(item), null));
            const nextCollection = {
                ...collection,
                items: [...normalizedItems, ...(collection.items || [])],
                updatedAt: new Date().toISOString()
            };
            store.collections[collectionIndex] = nextCollection;
            writeStore(store);
            json(res, 200, { collection: sanitizeCollection(nextCollection), imported: normalizedItems.length });
            return;
        }

        if (parsedUrl.pathname.match(new RegExp(`^${UI_API_BASE}/collections/[^/]+/items/[^/]+$`)) && req.method === 'DELETE') {
            const parts = parsedUrl.pathname.split('/');
            const collectionId = parts[parts.length - 3];
            const itemId = parts[parts.length - 1];
            const store = readStore();
            const collectionIndex = store.collections.findIndex((item) => item.id === collectionId);
            if (collectionIndex < 0) return notFound(res, 'Collection not found.');
            const collection = store.collections[collectionIndex];
            const descendants = getCollectionItemDescendants(collection.items || [], itemId);
            for (const item of collection.items || []) {
                if (descendants.has(item.id) && item.mockId) deleteMockById(store, item.mockId);
            }
            const nextCollection = {
                ...collection,
                items: (collection.items || []).filter((item) => !descendants.has(item.id)),
                updatedAt: new Date().toISOString()
            };
            store.collections[collectionIndex] = nextCollection;
            writeStore(store);
            json(res, 200, { collection: sanitizeCollection(nextCollection), success: true });
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/mocks` && req.method === 'POST') {
            const body = await collectRequestBody(req);
            const payload = parseJsonSafe(body.toString('utf8'), {});
            const store = readStore();
            const existingIndex = (store.mocks || []).findIndex((mock) => mock.id === payload.id);
            const existing = existingIndex >= 0 ? store.mocks[existingIndex] : null;
            const normalized = normalizeMock(payload, existing);
            if (payload.media?.base64) normalized.media = saveMediaAsset(normalized.id, payload.media);
            if (existingIndex >= 0) store.mocks[existingIndex] = normalized;
            else store.mocks.unshift(normalized);
            writeStore(store);
            json(res, 200, { mock: sanitizeMockForClient(normalized) });
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/mocks` && req.method === 'DELETE') {
            const store = readStore();
            (store.mocks || []).forEach(deleteMediaAssetIfNeeded);
            store.mocks = [];
            writeStore(store);
            json(res, 200, { success: true });
            return;
        }

        if (parsedUrl.pathname.startsWith(`${UI_API_BASE}/mocks/`) && req.method === 'DELETE') {
            const mockId = parsedUrl.pathname.replace(`${UI_API_BASE}/mocks/`, '');
            const store = readStore();
            const target = (store.mocks || []).find((mock) => mock.id === mockId);
            if (!target) return notFound(res, 'Mock not found.');
            deleteMediaAssetIfNeeded(target);
            store.mocks = (store.mocks || []).filter((mock) => mock.id !== mockId);
            writeStore(store);
            json(res, 200, { success: true });
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/trigger` && req.method === 'POST') {
            const body = await collectRequestBody(req);
            const payload = parseJsonSafe(body.toString('utf8'), {});
            const result = await performHttpRequest({
                url: payload.url,
                method: payload.method,
                headers: normalizeHeaders(payload.headers),
                body: payload.body,
                timeoutMs: payload.timeoutMs
            });
            const store = readStore();
            appendLog(store, {
                id: createId('log'),
                kind: 'trigger',
                method: payload.method,
                path: payload.url,
                at: new Date().toISOString(),
                statusCode: result.statusCode
            });
            json(res, 200, result);
            return;
        }

        if (parsedUrl.pathname === `${RUNNER_API_BASE}/workflows` && req.method === 'GET') {
            const store = readStore();
            json(res, 200, { workflows: (store.workflows || []).map(sanitizeWorkflow) });
            return;
        }

        if (parsedUrl.pathname === `${RUNNER_API_BASE}/workflows` && req.method === 'POST') {
            const body = await collectRequestBody(req);
            const payload = parseJsonSafe(body.toString('utf8'), {});
            const store = readStore();
            const existingIndex = (store.workflows || []).findIndex((workflow) => workflow.id === payload.id);
            const existing = existingIndex >= 0 ? store.workflows[existingIndex] : null;
            const normalized = normalizeWorkflow(payload, existing);
            if (existingIndex >= 0) store.workflows[existingIndex] = normalized;
            else store.workflows.unshift(normalized);
            writeStore(store);
            json(res, 200, { workflow: sanitizeWorkflow(normalized) });
            return;
        }

        if (parsedUrl.pathname.startsWith(`${RUNNER_API_BASE}/workflows/`) && req.method === 'DELETE') {
            const workflowId = parsedUrl.pathname.replace(`${RUNNER_API_BASE}/workflows/`, '');
            const store = readStore();
            store.workflows = (store.workflows || []).filter((workflow) => workflow.id !== workflowId);
            writeStore(store);
            json(res, 200, { success: true });
            return;
        }

        if (parsedUrl.pathname === `${RUNNER_API_BASE}/datasets` && req.method === 'GET') {
            const store = readStore();
            json(res, 200, { datasets: (store.datasets || []).map(sanitizeDataset) });
            return;
        }

        if (parsedUrl.pathname === `${RUNNER_API_BASE}/datasets` && req.method === 'POST') {
            const body = await collectRequestBody(req);
            const payload = parseJsonSafe(body.toString('utf8'), {});
            const parsed = parseDataset(payload.fileName || payload.name || 'dataset.xlsx', payload.base64 || '');
            const dataset = {
                id: payload.id || createId('dataset'),
                name: payload.name || path.basename(payload.fileName || 'dataset'),
                fileName: payload.fileName || 'dataset.xlsx',
                kind: parsed.kind,
                headers: parsed.headers,
                rows: parsed.rows,
                sheetName: parsed.sheetName,
                createdAt: new Date().toISOString()
            };
            const store = readStore();
            const existingIndex = store.datasets.findIndex((item) => item.id === dataset.id);
            if (existingIndex >= 0) store.datasets[existingIndex] = dataset;
            else store.datasets.unshift(dataset);
            writeStore(store);
            json(res, 200, { dataset: sanitizeDataset(dataset), preview: dataset.rows.slice(0, 10) });
            return;
        }

        if (parsedUrl.pathname.startsWith(`${RUNNER_API_BASE}/datasets/`) && req.method === 'DELETE') {
            const datasetId = parsedUrl.pathname.replace(`${RUNNER_API_BASE}/datasets/`, '');
            const store = readStore();
            store.datasets = (store.datasets || []).filter((dataset) => dataset.id !== datasetId);
            writeStore(store);
            json(res, 200, { success: true });
            return;
        }

        if (parsedUrl.pathname === `${RUNNER_API_BASE}/runs` && req.method === 'POST') {
            const body = await collectRequestBody(req);
            const payload = parseJsonSafe(body.toString('utf8'), {});
            const store = readStore();
            const workflow = (store.workflows || []).find((item) => item.id === payload.workflowId);
            if (!workflow) {
                json(res, 404, { error: 'Workflow not found.' });
                return;
            }
            const run = startWorkflowRun(workflow, store, { baseOrigin });
            json(res, 202, { run: sanitizeRun(run) });
            return;
        }

        if (parsedUrl.pathname.startsWith(`${RUNNER_API_BASE}/runs/`) && req.method === 'GET') {
            const runId = parsedUrl.pathname.replace(`${RUNNER_API_BASE}/runs/`, '');
            const run = activeRuns.get(runId);
            if (!run) {
                json(res, 404, { error: 'Run not found.' });
                return;
            }
            json(res, 200, { run: sanitizeRun(run) });
            return;
        }

        const bodyBuffer = await collectRequestBody(req);
        const match = findMock(readStore(), req.method, parsedUrl.pathname, req.headers);
        if (match) {
            await serveMock(req, res, bodyBuffer, parsedUrl);
            return;
        }

        notFound(res, 'No mock matched this request.');
    });

    server.listen(port, '127.0.0.1', () => {
        const url = `http://127.0.0.1:${port}${UI_BASE}`;
        console.log(`\nMockDeck running at ${url}`);
        console.log(`Runner workspace available at http://127.0.0.1:${port}${RUNNER_BASE}`);
        console.log(`Mock endpoints share the same server on http://127.0.0.1:${port}`);
        console.log('Press Ctrl+C to stop.\n');
        openBrowser(url);
    });
}

async function runWorkflowById(workflowId) {
    const store = readStore();
    const workflow = (store.workflows || []).find((item) => item.id === workflowId);
    if (!workflow) {
        console.error(`Workflow not found: ${workflowId}`);
        process.exit(1);
    }
    const baseOrigin = `http://127.0.0.1:${store.settings?.port || DEFAULT_PORT}`;
    const run = startWorkflowRun(workflow, store, { baseOrigin });
    while (run.status === 'running') {
        await delay(200);
    }
    console.log(JSON.stringify(sanitizeRun(run), null, 2));
    if (run.status !== 'completed') process.exit(1);
}

export default async function registerMockDeck(program) {
    program
        .description('Mock API studio with UI + CLI support, templating, media assets, proxying, trigger tools, and a dedicated workflow runner.')
        .addHelpText('after', `
Examples:
  Start MockDeck:
    $ zero-ops mockdeck

  List registered mocks:
    $ zero-ops mockdeck list

  Start the dedicated runner workspace:
    $ zero-ops mockdeck
    # then open /__mockdeck/runner

  Run a saved workflow from CLI:
    $ zero-ops mockdeck workflow-run <workflow-id>
`);

    program
        .command('list')
        .description('List all registered mocks')
        .option('--json', 'Print the full JSON store')
        .action((options) => {
            const store = readStore();
            if (options.json) {
                console.log(JSON.stringify(store.mocks || [], null, 2));
                return;
            }
            const rows = listMocksForDisplay(store);
            if (!rows.length) return console.log('No mocks registered.');
            console.table(rows);
        });

    program
        .command('delete <id>')
        .description('Delete a single mock by id')
        .action((id) => {
            const store = readStore();
            const target = (store.mocks || []).find((mock) => mock.id === id);
            if (!target) {
                console.error(`Mock not found: ${id}`);
                process.exit(1);
            }
            deleteMediaAssetIfNeeded(target);
            store.mocks = (store.mocks || []).filter((mock) => mock.id !== id);
            writeStore(store);
            console.log(`Deleted mock: ${id}`);
        });

    program
        .command('clear')
        .description('Delete all registered mocks')
        .action(() => {
            const store = readStore();
            (store.mocks || []).forEach(deleteMediaAssetIfNeeded);
            store.mocks = [];
            writeStore(store);
            console.log('All mocks deleted.');
        });

    program
        .command('add')
        .description('Create or update a mock from CLI')
        .option('--id <id>', 'Existing mock id to update')
        .option('--name <name>', 'Mock name')
        .option('--method <method>', 'HTTP method', 'GET')
        .option('--path <path>', 'Route path', '/')
        .option('--type <type>', 'Mock type: json, text, html, xml, media, proxy', 'json')
        .option('--status <status>', 'Status code', '200')
        .option('--delay <ms>', 'Artificial response delay in ms', '0')
        .option('--body <body>', 'Inline template/body')
        .option('--body-file <file>', 'Read template/body from file')
        .option('--header <pair>', 'Required request header in key:value format', (value, memo) => { memo.push(value); return memo; }, [])
        .option('--response-header <pair>', 'Response header in key:value format', (value, memo) => { memo.push(value); return memo; }, [])
        .option('--file <file>', 'Media file path for media mocks')
        .option('--content-type <type>', 'Media content type')
        .option('--proxy-url <url>', 'Target URL for proxy mocks')
        .action((options) => {
            const store = readStore();
            const existing = options.id ? (store.mocks || []).find((mock) => mock.id === options.id) : null;
            if (options.id && !existing) {
                console.error(`Mock not found: ${options.id}`);
                process.exit(1);
            }

            const payload = {
                ...existing,
                id: options.id || existing?.id,
                name: options.name || existing?.name,
                method: options.method,
                path: options.path,
                type: options.type,
                statusCode: Number(options.status),
                delayMs: Number(options.delay),
                templateBody: options.body || options.bodyFile ? readCliBody(options) : existing?.templateBody,
                requestHeaders: parseKeyValuePairs(options.header),
                responseHeaders: parseKeyValuePairs(options.responseHeader),
                proxy: { targetUrl: options.proxyUrl || existing?.proxy?.targetUrl || '' }
            };

            const normalized = normalizeMock(payload, existing);
            if (options.file) {
                const filePath = path.resolve(options.file);
                const fileBuffer = fs.readFileSync(filePath);
                const storedAs = `${normalized.id}${path.extname(filePath)}`;
                const { assetDir } = getPaths();
                fs.writeFileSync(path.join(assetDir, storedAs), fileBuffer);
                normalized.media = {
                    assetName: path.basename(filePath),
                    storedAs,
                    contentType: options.contentType || existing?.media?.contentType || 'application/octet-stream',
                    size: fileBuffer.length
                };
            }
            const existingIndex = existing ? store.mocks.findIndex((mock) => mock.id === existing.id) : -1;
            if (existingIndex >= 0) store.mocks[existingIndex] = normalized;
            else store.mocks.unshift(normalized);
            writeStore(store);
            console.log(`Saved mock ${normalized.id}: ${normalized.method} ${normalized.path} (${normalized.type})`);
        });

    program
        .command('workflow-list')
        .description('List saved runner workflows')
        .action(() => {
            const store = readStore();
            const rows = (store.workflows || []).map((workflow) => ({
                id: workflow.id,
                name: workflow.name,
                nodes: workflow.nodes?.length || 0,
                datasetId: workflow.datasetId || '',
                updatedAt: workflow.updatedAt
            }));
            if (!rows.length) return console.log('No workflows saved.');
            console.table(rows);
        });

    program
        .command('workflow-run <id>')
        .description('Run a saved workflow from CLI')
        .action(async (id) => {
            await runWorkflowById(id);
        });

    program.action(async () => {
        const store = readStore();
        const port = Number(process.env.PORT || store.settings?.port || DEFAULT_PORT);
        store.settings.port = port;
        writeStore(store);
        await startServer(port);
    });
}
