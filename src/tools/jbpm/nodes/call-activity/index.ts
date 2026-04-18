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
        { key: 'name', label: 'Call Label', type: 'text' },
        { key: 'subProcessId', label: 'Process Ref', type: 'text', placeholder: 'e.g. Identity_Verify_v1' },
        { key: 'variableMapping', label: 'In/Out Mapping', type: 'keyvalue', description: 'Variables to pass to/from child.' }
    ],
    documentation: {
        desc: 'Modular Orchestration. Invokes another independent BPMN process as a reusable service.',
        flow: 'Spawn Child Instance -> Wait -> Map Output variables back to parent.',
        example: 'KYC_Validation_Subflow'
    },
    action: async (ctx) => {
        ctx.logger(`Spawning sub-orchestration: ${ctx.config.subProcessId}`);
        return { success: true };
    }
};

registerNode(callActivity);
export default callActivity;
