import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const endEvent: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/end-event/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Terminal State Label', type: 'text', group: 'general', placeholder: 'e.g. Order-Complete', required: true },
        { key: 'outputMapping', label: 'Final Result Mapping (Variable -> Response)', type: 'keyvalue', group: 'mapping', required: true, description: 'Map global process variables to the final response payload.', mapping: { typed: true, sourceScope: 'process', targetScope: 'output' } }
    ],
    documentation: {
        desc: 'Terminal node. Marks the successful completion of a process branch and defines the exit contract.',
        flow: 'Logic: [Variable Resolution] -> [Response Mapping] -> [Instance Termination].',
        example: '{ "orderId": "${variables.id}", "status": "SHIPPED" }'
    },
    action: async (ctx) => {
        ctx.logger('Process instance reached termination.');
        return { success: true };
    }
};

registerNode(endEvent);
export default endEvent;
