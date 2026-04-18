import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const parallelGateway: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/parallel-gateway/assets/icon.svg',
    fields: [],
    documentation: {
        desc: 'Concurrency Orchestrator. Splits the process into multiple simultaneous threads.',
        flow: 'FORK: Multi-thread execution. JOIN: Wait for all threads.',
        example: 'Parallel Approval Split.'
    },
    action: async (ctx) => {
        ctx.logger('Parallel gateway orchestration split.');
        return { success: true };
    }
};

registerNode(parallelGateway);
export default parallelGateway;
