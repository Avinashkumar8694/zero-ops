import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const eventBasedGateway: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/event-based-gateway/assets/icon.svg',
    fields: [],
    documentation: {
        desc: 'Reactive Split. Diverts the flow to the path whose event occurs first (Message vs Timer).',
        flow: 'Suspend execution -> Listen for multi-event triggers -> Resume on first match.',
        example: 'Wait for Payment vs 24h Expiry.'
    },
    action: async (ctx) => {
        ctx.logger('Event-based gateway reactive listener activated.');
        return { success: true };
    }
};

registerNode(eventBasedGateway);
export default eventBasedGateway;
