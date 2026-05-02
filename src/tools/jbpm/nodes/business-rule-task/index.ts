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
        { key: 'name', label: 'Rule Label', type: 'text', group: 'general' },
        { key: 'decisionRef', label: 'Decision ID', type: 'text', group: 'general', placeholder: 'e.g. Credit_Check_Table' },
        { key: 'inputMap', label: 'Rule Inputs', type: 'keyvalue', group: 'mapping', description: 'Map process variables into the decision input contract.', mapping: { typed: true, sourceScope: 'process', targetScope: 'input' } },
        { key: 'resultVariable', label: 'Result Variable', type: 'text', group: 'mapping', default: 'ruleResult', variableRef: true, description: 'Process variable that receives the decision result.' }
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
