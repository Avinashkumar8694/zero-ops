import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const sendTask: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/send-task/assets/icon.svg',
    fields: [
        { key: 'messageId', label: 'Message Type', type: 'select', options: ['EMAIL', 'SMS', 'WEBHOOK', 'KAFKA'] },
        { key: 'target', label: 'Recipient/Topic', type: 'text' },
        { key: 'payload', label: 'Signal Body', type: 'snippet', description: 'Supports interpolation.' }
    ],
    documentation: {
        desc: 'Outbound Notification. Sends an asynchronous signal (Email, Webhook) without waiting for a response.',
        flow: 'Fire-and-forget orchestration for system-to-system messaging.',
        example: '{ "to": "admin@ops.ai" }'
    },
    action: async (ctx) => {
        ctx.logger(`Outbound signal triggered via ${ctx.config.messageId}: ${ctx.config.target}`);
        return { success: true };
    }
};

registerNode(sendTask);
export default sendTask;
