import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const inclusiveGateway: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/inclusive-gateway/assets/icon.svg',
    fields: [],
    documentation: {
        desc: 'Conditional Concurrency. Executes ALL outgoing flows where the condition evaluates to true.',
        flow: 'Logical OR Split -> Synchronization on Merge.',
        example: 'Multi-branch conditional logic.'
    },
    action: async (ctx) => {
        ctx.logger('Inclusive gateway branching evaluation.');
        return { success: true };
    }
};

registerNode(inclusiveGateway);
export default inclusiveGateway;
