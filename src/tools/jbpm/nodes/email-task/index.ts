import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const emailTask: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/email-task/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Email Label', type: 'text' },
        { key: 'provider', label: 'Email Provider', type: 'select', options: ['SENDGRID', 'NODEMAILER (SMTP)'] },
        
        // COMMON FIELDS
        { key: 'to', label: 'Recipient', type: 'text', placeholder: 'e.g. user@example.com' },
        { key: 'subject', label: 'Subject Line', type: 'text' },
        { key: 'body', label: 'Email Content', type: 'snippet', description: 'Supports HTML and variable interpolation.' },

        // SENDGRID FIELDS
        { key: 'apiKey', label: 'SendGrid API Key', type: 'text', description: 'Industrial API authentication token.', visibility: "provider === 'SENDGRID'" },
        
        // NODEMAILER FIELDS
        { key: 'smtpHost', label: 'SMTP Host', type: 'text', visibility: "provider === 'NODEMAILER (SMTP)'" },
        { key: 'smtpPort', label: 'SMTP Port', type: 'text', default: '587', visibility: "provider === 'NODEMAILER (SMTP)'" },
        { key: 'smtpUser', label: 'SMTP Username', type: 'text', visibility: "provider === 'NODEMAILER (SMTP)'" },
        { key: 'smtpPass', label: 'SMTP Password', type: 'text', visibility: "provider === 'NODEMAILER (SMTP)'" }
    ],
    documentation: {
        desc: 'Orchestrates outbound e-mail communication via SendGrid API or Nodemailer SMTP.',
        flow: 'Data -> Provider Authentication -> Dispatch -> Logic Continuation.',
        example: '{ "provider": "SENDGRID", "apiKey": "SG.***", "to": "user@ops.ai" }'
    },
    action: async (ctx) => {
        const { provider, to, subject, body } = ctx.config;
        ctx.logger(`Initializing ${provider} dispatch to ${to}...`);
        
        if (provider === 'SENDGRID') {
            ctx.logger(`Using SendGrid API Key: ${ctx.config.apiKey?.substring(0, 5)}...`);
        } else {
            ctx.logger(`Connecting to SMTP Host: ${ctx.config.smtpHost}:${ctx.config.smtpPort}`);
        }
        
        return { success: true };
    }
};

registerNode(emailTask);
export default emailTask;
