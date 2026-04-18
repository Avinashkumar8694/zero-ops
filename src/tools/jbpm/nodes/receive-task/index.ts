import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const receiveTask: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/receive-task/assets/icon.svg',
    fields: [{ key: 'messageName', label: 'Correlation ID', type: 'text' }],
    documentation: {
        desc: 'Inbound Synchronization. Pauses the process until a matching external message is received.',
        flow: 'Suspend execution thread -> Match Signal -> Resume with payload.',
        example: 'PAYMENT_CONFIRMED'
    },
    action: async (ctx) => {
        ctx.logger(`Engine suspended awaiting message: ${ctx.config.messageName}`);
        return { success: true };
    }
};

registerNode(receiveTask);
export default receiveTask;
