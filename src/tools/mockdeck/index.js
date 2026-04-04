import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import https from 'https';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..', '..');

const DEFAULT_PORT = 8381;
const UI_BASE = '/__mockdeck';
const UI_API_BASE = `${UI_BASE}/api`;

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

function ensureStorage() {
    const { dataDir, assetDir, storePath } = getPaths();
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(assetDir, { recursive: true });
    if (!fs.existsSync(storePath)) {
        fs.writeFileSync(storePath, JSON.stringify({ mocks: [], logs: [], settings: { port: DEFAULT_PORT } }, null, 2), 'utf8');
    }
}

function readStore() {
    ensureStorage();
    const { storePath } = getPaths();
    try {
        return JSON.parse(fs.readFileSync(storePath, 'utf8'));
    } catch (error) {
        return { mocks: [], logs: [], settings: { port: DEFAULT_PORT } };
    }
}

function writeStore(store) {
    ensureStorage();
    const { storePath } = getPaths();
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function createId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
        id: existing?.id || input.id || createId(),
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

function normalizeMedia(media, existing = null) {
    if (!media) return existing || null;
    return {
        assetName: media.assetName || existing?.assetName || '',
        storedAs: media.storedAs || existing?.storedAs || '',
        contentType: media.contentType || existing?.contentType || 'application/octet-stream',
        size: Number(media.size ?? existing?.size ?? 0)
    };
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

function parseJsonSafe(value, fallback = null) {
    if (value === undefined || value === null || value === '') return fallback;
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
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

function appendLog(store, entry) {
    const nextLogs = [entry, ...(store.logs || [])].slice(0, 100);
    store.logs = nextLogs;
    writeStore(store);
}

function sanitizeMockForClient(mock) {
    const { assetDir } = getPaths();
    return {
        ...mock,
        assetExists: mock.media?.storedAs ? fs.existsSync(path.join(assetDir, mock.media.storedAs)) : false
    };
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
        const req = transport.request({
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

        req.on('timeout', () => req.destroy(new Error('Request timed out')));
        req.on('error', (error) => {
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

        if (bodyBuffer.length) req.write(bodyBuffer);
        req.end();
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

async function serveMock(match, req, res, bodyBuffer, parsedUrl) {
    const store = readStore();
    const liveMatch = findMock(store, req.method, parsedUrl.pathname, req.headers);
    if (!liveMatch) {
        notFound(res, 'Mock not found.');
        return;
    }
    const { mock, params } = liveMatch;
    if (mock.delayMs > 0) {
        await delay(mock.delayMs);
    }

    appendLog(store, {
        id: createId(),
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
    if (options.bodyFile) {
        return fs.readFileSync(path.resolve(options.bodyFile), 'utf8');
    }
    return options.body || '';
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
    return 'application/octet-stream';
}

async function startServer(port) {
    ensureStorage();
    const viewPath = path.join(__dirname, 'views', 'index.ejs');
    const publicDir = path.join(__dirname, 'public');
    const host = '127.0.0.1';
    const server = http.createServer(async (req, res) => {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

        if (req.method === 'GET' && parsedUrl.pathname === '/') {
            res.writeHead(302, { Location: UI_BASE });
            res.end();
            return;
        }

        if (req.method === 'GET' && parsedUrl.pathname === UI_BASE) {
            const store = readStore();
            const html = await ejs.renderFile(viewPath, {
                uiBase: UI_BASE,
                apiBase: UI_API_BASE,
                initialState: JSON.stringify({
                    mocks: (store.mocks || []).map(sanitizeMockForClient),
                    logs: store.logs || [],
                    templates: DEFAULT_TEMPLATES
                })
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
                logs: store.logs || [],
                templates: DEFAULT_TEMPLATES
            });
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/mocks` && req.method === 'GET') {
            const store = readStore();
            json(res, 200, { mocks: (store.mocks || []).map(sanitizeMockForClient) });
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/mocks` && req.method === 'POST') {
            const body = await collectRequestBody(req);
            const payload = parseJsonSafe(body.toString('utf8'), {});
            const store = readStore();
            const existingIndex = (store.mocks || []).findIndex((mock) => mock.id === payload.id);
            const existing = existingIndex >= 0 ? store.mocks[existingIndex] : null;
            const normalized = normalizeMock(payload, existing);
            if (payload.media?.base64) {
                normalized.media = saveMediaAsset(normalized.id, payload.media);
            }
            if (existingIndex >= 0) store.mocks[existingIndex] = normalized;
            else store.mocks.unshift(normalized);
            writeStore(store);
            json(res, 200, { mock: sanitizeMockForClient(normalized) });
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/mocks` && req.method === 'DELETE') {
            const store = readStore();
            (store.mocks || []).forEach((mock) => {
                if (mock.media?.storedAs) {
                    const { assetDir } = getPaths();
                    const assetPath = path.join(assetDir, mock.media.storedAs);
                    if (fs.existsSync(assetPath)) fs.unlinkSync(assetPath);
                }
            });
            store.mocks = [];
            writeStore(store);
            json(res, 200, { success: true });
            return;
        }

        if (parsedUrl.pathname.startsWith(`${UI_API_BASE}/mocks/`) && req.method === 'DELETE') {
            const mockId = parsedUrl.pathname.replace(`${UI_API_BASE}/mocks/`, '');
            const store = readStore();
            const target = (store.mocks || []).find((mock) => mock.id === mockId);
            if (!target) {
                notFound(res, 'Mock not found.');
                return;
            }
            if (target.media?.storedAs) {
                const { assetDir } = getPaths();
                const assetPath = path.join(assetDir, target.media.storedAs);
                if (fs.existsSync(assetPath)) fs.unlinkSync(assetPath);
            }
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
                id: createId(),
                kind: 'trigger',
                method: payload.method,
                path: payload.url,
                at: new Date().toISOString(),
                statusCode: result.statusCode
            });
            json(res, 200, result);
            return;
        }

        if (parsedUrl.pathname === `${UI_API_BASE}/run` && req.method === 'POST') {
            const body = await collectRequestBody(req);
            const payload = parseJsonSafe(body.toString('utf8'), {});
            const steps = Array.isArray(payload.steps) ? payload.steps : [];
            const context = { steps: {}, last: null };
            const results = [];
            for (let index = 0; index < steps.length; index += 1) {
                const step = steps[index];
                const requestInput = {
                    url: renderTemplate(step.url || '', context),
                    method: (step.method || 'GET').toUpperCase(),
                    headers: Object.fromEntries(Object.entries(step.headers || {}).map(([key, value]) => [key, renderTemplate(String(value), context)])),
                    body: renderTemplate(step.body || '', context),
                    timeoutMs: Number(step.timeoutMs || 15000)
                };
                const result = await performHttpRequest(requestInput);
                const resultEntry = { name: step.name || `Step ${index + 1}`, request: requestInput, response: result };
                results.push(resultEntry);
                context.steps[step.name || `step${index + 1}`] = {
                    request: requestInput,
                    statusCode: result.statusCode,
                    headers: result.headers,
                    body: result.bodyJson ?? result.bodyText
                };
                context.last = context.steps[step.name || `step${index + 1}`];
                if (payload.stopOnError && !result.ok) break;
            }
            json(res, 200, { results });
            return;
        }

        const bodyBuffer = await collectRequestBody(req);
        const match = findMock(readStore(), req.method, parsedUrl.pathname, req.headers);
        if (match) {
            await serveMock(match, req, res, bodyBuffer, parsedUrl);
            return;
        }

        notFound(res, 'No mock matched this request.');
    });

    server.listen(port, host, () => {
        const url = `http://${host}:${port}${UI_BASE}`;
        console.log(`\nMockDeck running at ${url}`);
        console.log(`Mock endpoints share the same server on http://${host}:${port}`);
        console.log('Press Ctrl+C to stop.\n');
        openBrowser(url);
    });
}

export default async function registerMockDeck(program) {
    program
        .description('Mock API studio with UI + CLI support, templating, media assets, proxying, and request runner.')
        .addHelpText('after', `
Examples:
  Start the UI:
    $ zero-ops mockdeck

  List all registered mocks:
    $ zero-ops mockdeck list

  Add a JSON mock from CLI:
    $ zero-ops mockdeck add --name "Users" --method GET --path /api/users --type json --body '{ "users": [] }'

  Register a media mock:
    $ zero-ops mockdeck add --name Avatar --method GET --path /assets/avatar --type media --file ./avatar.png --content-type image/png

  Delete everything:
    $ zero-ops mockdeck clear
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
            if (!rows.length) {
                console.log('No mocks registered.');
                return;
            }
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
            if (target.media?.storedAs) {
                const { assetDir } = getPaths();
                const assetPath = path.join(assetDir, target.media.storedAs);
                if (fs.existsSync(assetPath)) fs.unlinkSync(assetPath);
            }
            store.mocks = (store.mocks || []).filter((mock) => mock.id !== id);
            writeStore(store);
            console.log(`Deleted mock: ${id}`);
        });

    program
        .command('clear')
        .description('Delete all registered mocks')
        .action(() => {
            const store = readStore();
            (store.mocks || []).forEach((mock) => {
                if (mock.media?.storedAs) {
                    const { assetDir } = getPaths();
                    const assetPath = path.join(assetDir, mock.media.storedAs);
                    if (fs.existsSync(assetPath)) fs.unlinkSync(assetPath);
                }
            });
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

    program.action(async () => {
        const store = readStore();
        const port = Number(process.env.PORT || store.settings?.port || DEFAULT_PORT);
        await startServer(port);
    });
}
