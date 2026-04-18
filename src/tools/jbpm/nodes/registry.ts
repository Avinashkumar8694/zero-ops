/**
 * Zero-BPM Industrial Primitive Registry (V6.5)
 * Defines the design-time schema and runtime action interfaces for all process nodes.
 */

export interface NodeField {
    key: string;
    label: string;
    type: 'text' | 'select' | 'textarea' | 'keyvalue' | 'toggle' | 'number' | 'snippet';
    options?: string[]; // For select dropdowns
    placeholder?: string;
    default?: any;
    description?: string;
    required?: boolean;
    visibility?: string; // eval-able logic e.g. "provider === 'SENDGRID'"
    variableRef?: boolean; // Trigger variable suggestion datalist
    flowRef?: boolean; // Trigger process flow selection datalist
}

export interface NodePackage {
    id: string; // The directory name (e.g. 'rest-task')
    bpmnType: string; // The BPMN primitive type (e.g. 'bpmn:ServiceTask')
    label: string;
    version: string;
    category: 'PROCESS' | 'TASK' | 'GATEWAY' | 'EVENT' | 'SYSTEM';
    fields: NodeField[];
    documentation: {
        desc: string;
        flow: string;
        example: string;
    };
    readme?: string; // Hydrated from README.md
    icon?: string;
    bpmnOptions?: any; // Options for bpmn-js element creation (e.g. eventDefinitions)
    action?: NodeAction; // Runtime execution logic
}

/** 
 * Runtime Action Context
 * Provided to the node's action.ts during execution.
 */
export interface ActionContext {
    instanceId: string;
    variables: Record<string, any>;
    config: any; // The structured JSON from the modeler
    logger: (msg: string) => void;
    secrets: (key: string) => string | undefined;
}

export interface NodeActivityResult {
    success: boolean;
    output?: Record<string, any>;
    error?: string;
}

export type NodeAction = (ctx: ActionContext) => Promise<NodeActivityResult>;

// --- GLOBAL SINGLETON ORCHESTRATION ---
if (!(globalThis as any).ZERO_BPM_REGISTRY) {
    (globalThis as any).ZERO_BPM_REGISTRY = {};
}
export const NODE_REGISTRY: Record<string, NodePackage> = (globalThis as any).ZERO_BPM_REGISTRY;

export function registerNode(pkg: NodePackage) {
    NODE_REGISTRY[pkg.id] = pkg; // Anchor by unique ID
    console.log(`[Zero-BPM] Node Registered: ${pkg.id} (${pkg.bpmnType})`);
}

// --- ROOT PROCESS ORCHESTRATION DEFINITION (V10.0) ---
registerNode({
    id: 'process-definitions',
    bpmnType: 'bpmn:Process',
    label: 'Global Service Configuration',
    version: '1.0.0',
    category: 'SYSTEM',
    fields: [
        { key: 'serviceOwner', label: 'Service Owner', type: 'text', placeholder: 'e.g. dev-ops@zero.ai' },
        { key: 'variables', label: 'Service Variables (Global Process State)', type: 'keyvalue' },
        { key: 'slaDefinition', label: 'Service SLA (Minutes)', type: 'number', default: 60 }
    ],
    documentation: {
        desc: 'Defines the global lifecycle and service contract for the process asset.',
        flow: 'Variables defined here are accessible as ${variables.name} across all nodes.',
        example: '{ "retryOnFailure": true }'
    }
});
