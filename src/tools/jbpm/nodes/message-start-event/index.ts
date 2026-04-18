import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const messageStartEvent: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/message-start-event/assets/icon.svg',
    fields: [{ key: 'messageName', label: 'Message ID', type: 'text' }],
    documentation: {
        desc: 'External Trigger. triggers the process when a specific asynchronous message is received.',
        flow: 'Inbound Message -> Variable Injection -> Initialization.',
        example: 'USER_CREATED_SIGNAL'
    },
    bpmnOptions: { eventDefinitions: [{ $type: 'bpmn:MessageEventDefinition' }] },
    action: async (ctx) => {
        ctx.logger(`Process initialized via message: ${ctx.config.messageName}`);
        return { success: true };
    }
};

registerNode(messageStartEvent);
export default messageStartEvent;
