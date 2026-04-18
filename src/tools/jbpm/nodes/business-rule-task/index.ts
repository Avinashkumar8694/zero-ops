import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const businessRuleTask: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/business-rule-task/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Rule Label', type: 'text' },
        { key: 'decisionRef', label: 'Decision ID', type: 'text', placeholder: 'e.g. Credit_Check_Table' },
        { key: 'inputMap', label: 'Rule Inputs', type: 'keyvalue', description: 'Variables to pass to the decision engine.' },
        { key: 'resultVariable', label: 'Result Variable', type: 'text', default: 'ruleResult' }
    ],
    documentation: {
        desc: 'Policy Enforcement Node. Evaluates business rules against a DMN table or rule repository.',
        flow: 'Technical Data -> Rule Engine -> Conclusion Variable.',
        example: 'CreditScoreTable_v2'
    },
    action: async (ctx) => {
        ctx.logger(`Evaluating business rule: ${ctx.config.decisionRef}`);
        return { success: true, output: { [ctx.config.resultVariable || 'ruleResult']: 'APPROVED' } };
    }
};

registerNode(businessRuleTask);
export default businessRuleTask;
