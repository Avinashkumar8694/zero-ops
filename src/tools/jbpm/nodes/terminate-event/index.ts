import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const terminateEvent: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/terminate-event/assets/icon.svg',
    fields: [{ key: 'name', label: 'Termination Label', type: 'text' }],
    documentation: {
        desc: 'Global Kill. Immediately halts all active threads in the process instance.',
        flow: 'Thread Interruption -> Force State Persistence.',
        example: '{}'
    },
    bpmnOptions: { eventDefinitions: [{ $type: 'bpmn:TerminateEventDefinition' }] },
    action: async (ctx) => {
        ctx.logger('Process instance globally terminated.');
        return { success: true };
    }
};

registerNode(terminateEvent);
export default terminateEvent;
