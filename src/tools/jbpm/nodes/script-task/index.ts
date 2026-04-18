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
        { key: 'name', label: 'Script Label', type: 'text', placeholder: 'e.g., Calculate Discount' },
        { key: 'script', label: 'Logic Snippet (JS)', type: 'snippet', description: 'Internal variable manipulation logic.' },
        { key: 'language', label: 'Language', type: 'select', options: ['javascript'], default: 'javascript' }
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
