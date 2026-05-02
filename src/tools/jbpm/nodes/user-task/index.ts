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
        { key: 'name', label: 'Instruction Label', type: 'text', group: 'general', placeholder: 'e.g., Approve Expense Report', required: true },
        { key: 'assignee', label: 'Assigned Actor', type: 'text', group: 'assignment', placeholder: 'admin, roles/approver', description: 'ID or variable expression.', variableRef: true },
        { key: 'candidateGroups', label: 'Candidate Groups', type: 'text', group: 'assignment', placeholder: 'FINANCE,HR', description: 'Comma-separated group names or expressions.', variableRef: true },
        { key: 'formKey', label: 'Form Identifier', type: 'text', group: 'assignment', placeholder: 'leave-form-v1', description: 'Zero-Form ID to render.', required: true },
        { key: 'priority', label: 'Urgency', type: 'select', group: 'assignment', options: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'], default: 'NORMAL' },
        { key: 'inputMapping', label: 'Task Input Mapping', type: 'keyvalue', group: 'mapping', description: 'Map process variables into the task form/task local scope.', mapping: { typed: true, sourceScope: 'process', targetScope: 'task' } },
        { key: 'outputMapping', label: 'Task Output Mapping', type: 'keyvalue', group: 'mapping', description: 'Map submitted task values back into process variables.', mapping: { typed: true, sourceScope: 'task', targetScope: 'process' } }
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
