import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };
import { action } from './action.js';

const userTask: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/user-task/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Instruction Label', type: 'text', placeholder: 'e.g., Approve Expense Report' },
        { key: 'assignee', label: 'Assigned Actor', type: 'text', placeholder: 'admin, roles/approver', description: 'ID or variable expression.' },
        { key: 'formKey', label: 'Form Identifier', type: 'text', placeholder: 'leave-form-v1', description: 'Zero-Form ID to render.' },
        { key: 'priority', label: 'Urgency', type: 'select', options: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'], default: 'NORMAL' }
    ],
    documentation: {
        desc: 'Human-Centric Node. Halts execution until an actor completes the task.',
        flow: 'Task Creation -> Worklist Sync -> Actor Completion -> Résumé.',
        example: '{\n  "assignee": "hr_manager",\n  "formKey": "onboarding-v1"\n}'
    },
    action
};

registerNode(userTask);
export default userTask;
