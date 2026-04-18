import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const exclusiveGateway: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/exclusive-gateway/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Decision Name', type: 'text', placeholder: 'e.g., Is Credit Score OK?' }
    ],
    documentation: {
        desc: 'Branching Node. Directs the flow based on evaluated sequence conditions.',
        flow: 'Logic Split -> Sequence Evaluation -> Single Path Selection.',
        example: 'Mutually exclusive paths.'
    }
};

registerNode(exclusiveGateway);
export default exclusiveGateway;
