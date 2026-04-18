import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };
import { action } from './action.js';

const sequenceFlow: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/sequence-flow/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Route Label', type: 'text', placeholder: 'e.g., If Amount > 500' },
        { key: 'conditionExpression', label: 'Boolean Condition (JS)', type: 'snippet', description: 'Evaluates to true/false. e.g. variables.score > 700' },
        { key: 'isDefault', label: 'Default Flow', type: 'toggle', default: false, description: 'Taken if no other routes match.' }
    ],
    documentation: {
        desc: 'Edge Logic. Directs process movement based on evaluated system state.',
        flow: 'Source Completion -> Condition Check -> Target Activation.',
        example: 'variables.total > 1000'
    },
    action
};

registerNode(sequenceFlow);
export default sequenceFlow;
