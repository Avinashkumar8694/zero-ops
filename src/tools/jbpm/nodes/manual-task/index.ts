import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const manualTask: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/manual-task/assets/icon.svg',
    fields: [{ key: 'instruction', label: 'Ops Instruction', type: 'textarea' }],
    documentation: {
        desc: 'Offline Work. Marks a step that must be performed manually without engine interaction.',
        flow: 'Process waits for external ACK or Completion Signal.',
        example: 'Verify physical signatures.'
    },
    action: async (ctx) => {
        ctx.logger(`Manual task recorded: ${ctx.config.instruction}`);
        return { success: true };
    }
};

registerNode(manualTask);
export default manualTask;
