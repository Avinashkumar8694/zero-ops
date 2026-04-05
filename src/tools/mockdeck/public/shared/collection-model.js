export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ANY'];
export const REQUEST_KINDS = ['real', 'mock', 'proxy'];

export function emptyCollection() {
    return { id: '', name: 'New Collection', description: '', items: [] };
}

export function emptyRequest(parentId = null) {
    return {
        id: '',
        type: 'request',
        kind: 'real',
        parentId,
        name: '',
        description: '',
        method: 'GET',
        url: '',
        headersText: 'content-type: application/json',
        bodyType: 'raw', // none, raw, multipart, urlencoded
        body: '',
        formData: [], // [{ key, value, type: 'text' | 'file', fileName }]
        mockPath: '/api/example',
        mockStatusCode: 200,
        mockDelayMs: 0,
        mockTemplateBody: '{\n  "ok": true\n}',
        proxyTargetUrl: '',
        responseHeadersText: 'content-type: application/json; charset=utf-8'
    };
}

export function emptyFolder(parentId = null) {
    return { id: '', type: 'folder', kind: 'folder', parentId, name: 'New Folder', description: '', folderColor: '' };
}
