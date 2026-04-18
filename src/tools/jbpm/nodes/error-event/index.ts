import { registerNode, NodePackage } from '../registry.js';

const errorEvent: NodePackage = {
    id: 'error-event',
    bpmnType: 'bpmn:EndEvent',
    label: 'Error End',
    version: '1.0.0',
    category: 'EVENT',
    icon: '/nodes/error-event/assets/icon.svg',
    fields: [
        { key: 'errorCode', label: 'Error Code', type: 'text' },
        { key: 'errorMessage', label: 'Technical Description', type: 'textarea' }
    ],
    documentation: {
        desc: 'Terminal Error primitive. Immediately halts the process and triggers an error boundary event or global handler.',
        flow: 'Exception Trigger -> Stack Unwind -> Error Catching.',
        example: '{ "errorCode": "DB_CONN_TIMEOUT" }'
    },
    bpmnOptions: { eventDefinitions: [{ $type: 'bpmn:ErrorEventDefinition' }] },
    action: async (ctx) => {
        ctx.logger(`Process terminated with error: ${ctx.config.errorCode}`);
        return { success: false, error: ctx.config.errorMessage };
    }
};

registerNode(errorEvent);
export default errorEvent;
