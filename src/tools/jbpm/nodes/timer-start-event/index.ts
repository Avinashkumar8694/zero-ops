import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const timerStartEvent: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/timer-start-event/assets/icon.svg',
    fields: [{ key: 'timerCycle', label: 'Cron / Cycle', type: 'text', placeholder: '0 0 * * *' }],
    documentation: {
        desc: 'Temporal Entry. Triggers the process on a recurring schedule (Cron/Cycle).',
        flow: 'Scheduled Scheduler -> Instance Initialization.',
        example: '0 0 * * * (Daily at midnight)'
    },
    bpmnOptions: { eventDefinitions: [{ $type: 'bpmn:TimerEventDefinition' }] },
    action: async (ctx) => {
        ctx.logger('Process instance triggered by timer.');
        return { success: true };
    }
};

registerNode(timerStartEvent);
export default timerStartEvent;
