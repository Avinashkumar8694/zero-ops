import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };
import { action } from './action.js';

const restTask: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/rest-task/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Display Name', type: 'text', placeholder: 'e.g., Fetch User Data' },
        { key: 'endpoint', label: 'API Endpoint (URL)', type: 'text', placeholder: 'https://api.external.com/v1/resource', description: 'Supports variable interpolation using ${variables.key}', required: true },
        { key: 'method', label: 'HTTP Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
        { key: 'headers', label: 'Request Headers', type: 'keyvalue', description: 'Authorization tokens or custom headers.' },
        { key: 'body', label: 'Request Body', type: 'snippet', description: 'JSON payload for POST/PUT.' },
        { key: 'responseMap', label: 'Response Mapping', type: 'keyvalue', description: 'JSONPath -> Variable name.' }
    ],
    documentation: {
        desc: 'Integration Gateway. Orchestrates calls to external RESTful services.',
        flow: 'Outbound Payload -> HTTP Response -> Variable Hydration.',
        example: '{\n  "endpoint": "https://api.internal/process",\n  "method": "POST"\n}'
    },
    action
};

registerNode(restTask);
export default restTask;
