import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };
import { action } from './action.js';

const scriptTask: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/script-task/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Script Label', type: 'text', group: 'general', placeholder: 'e.g., Calculate Discount', required: true },
        { key: 'script', label: 'Logic Snippet (JS)', type: 'snippet', group: 'runtime', description: 'Internal variable manipulation logic.', required: true },
        { key: 'language', label: 'Language', type: 'select', group: 'runtime', options: ['javascript'], default: 'javascript' },
        { key: 'outputMapping', label: 'Output Mapping', type: 'keyvalue', group: 'mapping', description: 'Map computed script locals into process variables.', mapping: { typed: true, sourceScope: 'local', targetScope: 'process' } }
    ],
    documentation: {
        desc: 'Computational Node. Executes high-performance logic within the Zero-Sandbox.',
        flow: 'Direct variable mutation -> Immediate Résumé.',
        example: 'variables.tax = variables.subtotal * 0.15;'
    },
    action
};

registerNode(scriptTask);
export default scriptTask;
