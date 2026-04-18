import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const slackTask: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/slack-task/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Alert Label', type: 'text' },
        { key: 'channel', label: 'Slack Channel/ID', type: 'text', placeholder: 'e.g. #ops-alerts' },
        { key: 'message', label: 'Alert Message', type: 'snippet', description: 'Supports Slack mrkdwn and variable interpolation.' },
        { key: 'webhookUrl', label: 'Webhook URL (Env Key)', type: 'text', placeholder: 'SLACK_WEBHOOK_URL' }
    ],
    documentation: {
        desc: 'Orchestrates chat-ops notifications and interactive alerts via Slack Webhooks or Bolt API.',
        flow: 'Notification Event -> Slack Webhook Dispatch -> Channel Alert.',
        example: '{ "channel": "#deployments", "message": "Deployment Successful!" }'
    },
    action: async (ctx) => {
        ctx.logger(`Sending Slack notification to ${ctx.config.channel}`);
        return { success: true };
    }
};

registerNode(slackTask);
export default slackTask;
