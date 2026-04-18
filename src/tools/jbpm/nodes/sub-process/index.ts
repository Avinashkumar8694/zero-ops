import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const subProcess: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/sub-process/assets/icon.svg',
    fields: [],
    documentation: {
        desc: 'Hierarchical Container. Encapsulates complex logic into a sub-scope to maintain master-flow readability.',
        flow: 'Child scope execution. Inherits parent variables by default.',
        example: 'Retry Sequence.'
    },
    action: async (ctx) => {
        ctx.logger('Entering embedded sub-process scope.');
        return { success: true };
    }
};

registerNode(subProcess);
export default subProcess;
