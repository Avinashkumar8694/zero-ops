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
        { key: 'name', label: 'Process Instance Alias', type: 'text', group: 'general', placeholder: 'e.g. Order-Execution-Alpha', required: true },
        { key: 'triggerType', label: 'Activation Mode', type: 'select', 
          group: 'trigger', options: ['MANUAL', 'WEBHOOK', 'CRON', 'MESSAGE', 'SIGNAL'], default: 'MANUAL', required: true },
        { key: 'variableDefinitions', label: 'Shared Variable Definitions', type: 'keyvalue', group: 'variables', dataType: 'object', required: true, description: 'Define the global variables and default values shared across the process scope.' },
        { key: 'localVariables', label: 'Local Variables', type: 'keyvalue', group: 'variables', dataType: 'object', description: 'Transient variables for start-stage preprocessing before they are promoted into process scope.' },
        { key: 'inboundMapping', label: 'Input Mapping (Inbound -> Variable)', type: 'keyvalue', group: 'mapping', required: true, description: 'Map inbound trigger payload values into defined process variables.', mapping: { typed: true, sourceScope: 'input', targetScope: 'process' } },
        { key: 'outboundMapping', label: 'Output Mapping (Variable -> Response)', type: 'keyvalue', group: 'mapping', description: 'Map process variables into the trigger response payload.', mapping: { typed: true, sourceScope: 'process', targetScope: 'output' } },
        { key: 'cronExpression', label: 'Schedule (CRON)', type: 'text', group: 'trigger', dataType: 'cron', placeholder: 'e.g. 0 0 * * *', visibility: 'triggerType === "CRON"' },
        { key: 'triggerPath', label: 'Webhook Endpoint', type: 'text', group: 'trigger', placeholder: 'e.g. /orders/new', visibility: 'triggerType === "WEBHOOK"' },
        { key: 'messageTopic', label: 'Message Topic / Topic', type: 'text', group: 'trigger', placeholder: 'e.g. orders.created', visibility: 'triggerType === "MESSAGE" || triggerType === "SIGNAL"' },
        { key: 'payloadSchema', label: 'Inbound Data Schema (JSON)', type: 'snippet', group: 'advanced', dataType: 'json', description: 'Defines the expected inbound payload shape for validation and dynamic form generation.' }
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
