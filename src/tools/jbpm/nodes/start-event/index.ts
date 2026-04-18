import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const startEvent: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: '6.5.0',
    category: pkg.category as any,
    icon: '/nodes/start-event/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Process Instance Alias', type: 'text', placeholder: 'e.g. Order-Execution-Alpha', required: true },
        { key: 'triggerType', label: 'Activation Mode', type: 'select', 
          options: ['MANUAL', 'WEBHOOK', 'CRON', 'MESSAGE', 'SIGNAL'], default: 'MANUAL', required: true },
        { key: 'variableDefinitions', label: 'Shared Variable Definitions', type: 'keyvalue', required: true, description: 'Define the global variables (and default values) shared across the entire flow.' },
        { key: 'inboundMapping', label: 'Input Mapping (Inbound -> Variable)', type: 'keyvalue', required: true, description: 'Map inbound trigger data to your defined process variables.' },
        { key: 'outboundMapping', label: 'Output Mapping (Variable -> Response)', type: 'keyvalue', description: 'Define the immediate response payload for synchronous triggers (e.g. Webhooks).' },
        { key: 'cronExpression', label: 'Schedule (CRON)', type: 'text', placeholder: 'e.g. 0 0 * * *', visibility: 'triggerType === "CRON"' },
        { key: 'triggerPath', label: 'Webhook Endpoint', type: 'text', placeholder: 'e.g. /orders/new', visibility: 'triggerType === "WEBHOOK"' },
        { key: 'messageTopic', label: 'Message Topic / Topic', type: 'text', placeholder: 'e.g. orders.created', visibility: 'triggerType === "MESSAGE"' },
        { key: 'payloadSchema', label: 'Inbound Data Schema (JSON)', type: 'snippet', description: 'Defines the expected shape of the inbound payload.' }
    ],
    documentation: {
        desc: 'Universal Genesis Node. The single permitted entry point for the process, supporting schedules, listeners, and API triggers.',
        flow: 'Logic: [Trigger Activation] -> [Payload Schema Validation] -> [Variable Injection].',
        example: '{ "customerId": "string", "amount": "number" }'
    },
    action: async (ctx) => {
        ctx.logger('Process instance initialized.');
        return { success: true, message: 'Process instance successfully initialized via Universal Trigger Gateway.' };
    }
};

registerNode(startEvent);
export default startEvent;
