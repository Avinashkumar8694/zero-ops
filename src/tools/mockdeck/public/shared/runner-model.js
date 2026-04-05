export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const HANDLE_SIZE = 24;
export const REQUEST_NODE_WIDTH = 176;
export const REQUEST_NODE_HEIGHT = 72;
export const START_NODE_WIDTH = 130;
export const START_NODE_HEIGHT = 72;

export function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

export function emptyNode(index = 1) {
    return {
        id: `node-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`,
        nodeType: 'request',
        name: `Node ${index}`,
        x: 360 + (index - 1) * 280,
        y: 140,
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

export function startNode() {
    return {
        id: `node-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`,
        nodeType: 'start',
        name: 'Start',
        x: 88,
        y: 264,
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

export function emptyWorkflow() {
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
            stopOnError: false,
            environmentId: ''
        },
        nodes: [startNode(), emptyNode(1)]
    };
}

export function getNodeSize(node) {
    return node?.nodeType === 'start'
        ? { width: START_NODE_WIDTH, height: START_NODE_HEIGHT }
        : { width: REQUEST_NODE_WIDTH, height: REQUEST_NODE_HEIGHT };
}
