import { WorkflowDefinition, WorkflowNode } from './types.js';

type MappingDescriptor = {
  target?: string;
  sourceScope?: 'process' | 'input' | 'output' | 'local' | 'task' | 'expression' | string;
  targetScope?: 'process' | 'input' | 'output' | 'local' | 'task' | string;
};

type RuntimeContexts = {
  process?: Record<string, any>;
  input?: Record<string, any>;
  output?: Record<string, any>;
  local?: Record<string, any>;
  task?: Record<string, any>;
};

const BPMN_TO_RUNTIME_TYPE: Record<string, string> = {
  startEvent: 'StartEvent',
  endEvent: 'EndEvent',
  serviceTask: 'ServiceTask',
  userTask: 'UserTask',
  scriptTask: 'ScriptTask',
  callActivity: 'CallActivity',
  receiveTask: 'ReceiveTask',
  sendTask: 'SendTask',
  manualTask: 'ManualTask',
  businessRuleTask: 'BusinessRuleTask',
  exclusiveGateway: 'ExclusiveGateway',
  inclusiveGateway: 'InclusiveGateway',
  parallelGateway: 'ParallelGateway',
  eventBasedGateway: 'EventBasedGateway',
  subProcess: 'SubProcess'
};

function normalizeNodePackageId(rawType: string, config: any): string | undefined {
  if (config?.__nodeMeta?.pkgId) return config.__nodeMeta.pkgId;

  const lower = String(rawType || '').toLowerCase();
  if (lower.endsWith('startevent')) return 'start-event';
  if (lower.endsWith('endevent')) return 'end-event';
  if (lower.endsWith('usertask')) return 'user-task';
  if (lower.endsWith('servicetask')) {
    return config?.endpoint ? 'rest-task' : undefined;
  }
  if (lower.endsWith('scripttask')) return 'script-task';
  if (lower.endsWith('callactivity')) return 'call-activity';
  if (lower.endsWith('receivetask')) return 'receive-task';
  if (lower.endsWith('sendtask')) return 'send-task';
  if (lower.endsWith('manualtask')) return 'manual-task';
  if (lower.endsWith('businessruletask')) return 'business-rule-task';
  if (lower.endsWith('subprocess')) return 'sub-process';
  if (lower.endsWith('exclusivegateway')) return 'exclusive-gateway';
  if (lower.endsWith('inclusivegateway')) return 'inclusive-gateway';
  if (lower.endsWith('parallelgateway')) return 'parallel-gateway';
  if (lower.endsWith('eventbasedgateway')) return 'event-based-gateway';
  return undefined;
}

function parseDefaultValue(definition: any): any {
  if (definition && typeof definition === 'object' && !Array.isArray(definition)) {
    if (Object.prototype.hasOwnProperty.call(definition, 'defaultValue')) return definition.defaultValue;
    if (Object.prototype.hasOwnProperty.call(definition, 'value')) return definition.value;
  }
  return definition;
}

export function buildVariablesFromDefinitions(source: any): Record<string, any> {
  if (!source || typeof source !== 'object') return {};
  const variables: Record<string, any> = {};
  Object.entries(source).forEach(([key, definition]) => {
    variables[key] = parseDefaultValue(definition);
  });
  return variables;
}

export function setByPath(target: Record<string, any>, rawPath: string, value: any) {
  const path = String(rawPath || '').trim();
  if (!path) return;

  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return;

  let cursor: Record<string, any> = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const segment = parts[i];
    if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  cursor[parts[parts.length - 1]] = value;
}

export function getByPath(target: Record<string, any>, rawPath: string): any {
  const path = String(rawPath || '').trim();
  if (!path) return undefined;
  return path.split('.').filter(Boolean).reduce((acc: any, part: string) => (acc == null ? undefined : acc[part]), target);
}

function isQuotedLiteral(value: string) {
  return (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
}

function parseLiteral(value: string): { matched: boolean; value?: any } {
  const normalized = String(value || '').trim();
  if (!normalized) return { matched: false };

  if (isQuotedLiteral(normalized)) {
    return { matched: true, value: normalized.slice(1, -1) };
  }
  if (normalized === 'true') return { matched: true, value: true };
  if (normalized === 'false') return { matched: true, value: false };
  if (normalized === 'null') return { matched: true, value: null };
  if (/^-?\d+(\.\d+)?$/.test(normalized)) return { matched: true, value: Number(normalized) };
  if ((normalized.startsWith('{') && normalized.endsWith('}')) || (normalized.startsWith('[') && normalized.endsWith(']'))) {
    try {
      return { matched: true, value: JSON.parse(normalized) };
    } catch (err) {
      return { matched: false };
    }
  }
  return { matched: false };
}

export function resolveMappingValue(sourceKey: string, contexts: RuntimeContexts, sourceScope: string = 'process'): any {
  const normalized = String(sourceKey || '').trim();
  if (!normalized) return undefined;

  const literal = parseLiteral(normalized);
  if (literal.matched) return literal.value;

  let path = normalized;

  if (normalized.startsWith('${') && normalized.endsWith('}')) {
    path = normalized.slice(2, -1).trim();
  } else if (normalized === '$') {
    path = '$';
  } else if (normalized.startsWith('$.')) {
    path = normalized;
  }

  const scopedContexts: RuntimeContexts = {
    process: contexts.process || {},
    input: contexts.input || {},
    output: contexts.output || {},
    local: contexts.local || {},
    task: contexts.task || {}
  };

  if (path === '$') {
    if (sourceScope === 'input') return scopedContexts.input;
    if (sourceScope === 'output') return scopedContexts.output;
    if (sourceScope === 'local') return scopedContexts.local;
    if (sourceScope === 'task') return scopedContexts.task;
    return scopedContexts.process;
  }

  if (path.startsWith('$.')) {
    const rootPath = path.slice(2);
    const rootContext = sourceScope === 'input'
      ? scopedContexts.input
      : sourceScope === 'output'
        ? scopedContexts.output
        : sourceScope === 'local'
          ? scopedContexts.local
          : sourceScope === 'task'
            ? scopedContexts.task
            : scopedContexts.process;
    return getByPath(rootContext || {}, rootPath);
  }

  if (path.startsWith('variables.')) {
    return getByPath(scopedContexts.process || {}, path.slice('variables.'.length));
  }

  if (path.startsWith('input.')) return getByPath(scopedContexts.input || {}, path.slice('input.'.length));
  if (path.startsWith('output.')) return getByPath(scopedContexts.output || {}, path.slice('output.'.length));
  if (path.startsWith('local.')) return getByPath(scopedContexts.local || {}, path.slice('local.'.length));
  if (path.startsWith('task.')) return getByPath(scopedContexts.task || {}, path.slice('task.'.length));

  const primaryContext = sourceScope === 'input'
    ? scopedContexts.input
    : sourceScope === 'output'
      ? scopedContexts.output
      : sourceScope === 'local'
        ? scopedContexts.local
        : sourceScope === 'task'
          ? scopedContexts.task
          : scopedContexts.process;

  const primaryValue = getByPath(primaryContext || {}, path);
  if (primaryValue !== undefined) return primaryValue;

  return getByPath(scopedContexts.process || {}, path);
}

export function applyMapping(
  mapping: Record<string, any> | undefined,
  contexts: RuntimeContexts,
  defaultSourceScope: 'input' | 'output' | 'process' | 'local' | 'task' = 'process'
): Record<string, any> {
  const result: Record<string, any> = {};
  if (!mapping || typeof mapping !== 'object') return result;

  Object.entries(mapping).forEach(([sourceKey, descriptor]) => {
    const normalizedDescriptor: MappingDescriptor = descriptor && typeof descriptor === 'object' && !Array.isArray(descriptor)
      ? descriptor
      : { target: String(descriptor || ''), sourceScope: defaultSourceScope };
    const target = String(normalizedDescriptor.target || '').trim();
    if (!target) return;

    const value = resolveMappingValue(sourceKey, contexts, normalizedDescriptor.sourceScope || defaultSourceScope);
    setByPath(result, target, value);
  });

  return result;
}

export function compileAssetToWorkflowDefinition(asset: any): WorkflowDefinition {
  const xml = String(asset?.bpmn_xml || '');
  const propertyMap = asset?.json_config || {};
  const processMatch = xml.match(/<bpmn:process\b[^>]*id="([^"]+)"[^>]*name="([^"]*)"/i);
  const processId = processMatch?.[1] || asset?.workflow_name || 'Process_1';
  const processName = processMatch?.[2] || asset?.workflow_name || processId;
  const processConfig = propertyMap[processId] || {};

  const sequenceRegex = /<bpmn:sequenceFlow\b[^>]*sourceRef="([^"]+)"[^>]*targetRef="([^"]+)"/gi;
  const dependencies = new Map<string, string[]>();
  for (const match of xml.matchAll(sequenceRegex)) {
    const sourceRef = match[1];
    const targetRef = match[2];
    const bucket = dependencies.get(targetRef) || [];
    bucket.push(sourceRef);
    dependencies.set(targetRef, bucket);
  }

  const elementRegex = /<bpmn:(startEvent|endEvent|serviceTask|userTask|scriptTask|callActivity|receiveTask|sendTask|manualTask|businessRuleTask|exclusiveGateway|inclusiveGateway|parallelGateway|eventBasedGateway|subProcess)\b([^>]*)>/gi;
  const nodes: WorkflowNode[] = [];
  for (const match of xml.matchAll(elementRegex)) {
    const tag = match[1];
    const attrs = match[2] || '';
    const idMatch = attrs.match(/\bid="([^"]+)"/i);
    if (!idMatch) continue;

    const nodeId = idMatch[1];
    const nameMatch = attrs.match(/\bname="([^"]*)"/i);
    const runtimeType = BPMN_TO_RUNTIME_TYPE[tag] || tag;
    const config = propertyMap[nodeId] || {};
    const pkgId = normalizeNodePackageId(runtimeType, config);

    nodes.push({
      id: nodeId,
      name: nameMatch?.[1] || config.name || nodeId,
      type: pkgId || runtimeType,
      dependencies: dependencies.get(nodeId) || [],
      config
    });
  }

  const globalVariables = buildVariablesFromDefinitions(processConfig.variables);
  const startNode = nodes.find(node => node.type === 'start-event' || node.type === 'StartEvent');
  const startVariables = startNode ? buildVariablesFromDefinitions(startNode.config?.variableDefinitions) : {};

  return {
    name: asset?.workflow_name || processName,
    namespace: asset?.namespace || processConfig.namespace || 'default',
    version: asset?.version || '1.0.0',
    variables: {
      ...globalVariables,
      ...startVariables
    },
    nodes
  };
}
