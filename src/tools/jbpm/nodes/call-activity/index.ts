import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const callActivity: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/call-activity/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Call Label', type: 'text', group: 'general', placeholder: 'e.g. Identity-Verification-Subflow', required: true },
        { key: 'targetProcess', label: 'Target Process Flow', type: 'text', group: 'general', flowRef: true, required: true, description: 'Select the independent BPMN asset to transactionally invoke.' },
        { key: 'waitForCompletion', label: 'Wait For Completion', type: 'select', group: 'runtime', options: ['true', 'false'], default: 'true', description: 'When false, the parent process continues asynchronously after invocation.' },
        { key: 'inputMapping', label: 'Input Mapping (Parent -> Child)', type: 'keyvalue', group: 'mapping', contractRef: 'input', contractSource: 'targetProcess', description: 'Map parent variables into the child process input contract.', mapping: { typed: true, sourceScope: 'process', targetScope: 'input' } },
        { key: 'outputMapping', label: 'Output Mapping (Child -> Parent)', type: 'keyvalue', group: 'mapping', contractRef: 'output', contractSource: 'targetProcess', description: 'Map child outputs back into the parent process scope.', mapping: { typed: true, sourceScope: 'output', targetScope: 'process' } }
    ],
    documentation: {
        desc: 'Modular Orchestration. Invokes another independent BPMN process as a reusable service.',
        flow: 'Spawn Child Instance -> Wait -> Map Output variables back to parent.',
        example: 'KYC_Validation_Subflow'
    },
    action: async (ctx) => {
        ctx.logger(`Spawning sub-orchestration: ${ctx.config.targetProcess}`);
        return { success: true };
    }
};

registerNode(callActivity);
export default callActivity;
