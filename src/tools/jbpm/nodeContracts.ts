import type { NodeField, NodePackage } from './nodes/registry.js';

export type FieldDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'object'
  | 'array'
  | 'expression'
  | 'cron'
  | 'url'
  | 'any';

export type FieldGroup =
  | 'general'
  | 'trigger'
  | 'assignment'
  | 'variables'
  | 'mapping'
  | 'runtime'
  | 'advanced';

export interface NodeValidationIssue {
  fieldKey: string;
  level: 'error' | 'warning';
  message: string;
}

export interface AssetContract {
  inputs: string[];
  outputs: string[];
  locals: string[];
}

export const FIELD_GROUP_LABELS: Record<FieldGroup, string> = {
  general: 'General',
  trigger: 'Trigger',
  assignment: 'Assignment',
  variables: 'Variables',
  mapping: 'Mappings',
  runtime: 'Runtime',
  advanced: 'Advanced'
};

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function looksLikeValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function looksLikeNumber(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string' || value.trim() === '') return false;
  return Number.isFinite(Number(value));
}

function looksLikeCron(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parts = trimmed.split(/\s+/);
  return parts.length >= 5 && parts.length <= 7;
}

export function inferFieldGroup(field: NodeField): FieldGroup {
  if (field.group) return field.group;
  if (field.key.includes('Mapping') || field.key.includes('Map')) return 'mapping';
  if (field.key.toLowerCase().includes('variable')) return 'variables';
  if (['assignee', 'candidateGroups', 'candidateUsers', 'formKey', 'priority'].includes(field.key)) return 'assignment';
  if (field.key.toLowerCase().includes('trigger') || field.key.toLowerCase().includes('cron') || field.key.toLowerCase().includes('message')) return 'trigger';
  if (field.key.toLowerCase().includes('retry') || field.key.toLowerCase().includes('timeout')) return 'runtime';
  return 'general';
}

export function groupNodeFields(fields: NodeField[]): Array<{ id: FieldGroup; label: string; fields: NodeField[] }> {
  const order: FieldGroup[] = ['general', 'trigger', 'assignment', 'variables', 'mapping', 'runtime', 'advanced'];
  const grouped = new Map<FieldGroup, NodeField[]>();

  for (const field of fields) {
    const group = inferFieldGroup(field);
    const bucket = grouped.get(group) || [];
    bucket.push(field);
    grouped.set(group, bucket);
  }

  return order
    .filter(group => (grouped.get(group) || []).length > 0)
    .map(group => ({ id: group, label: FIELD_GROUP_LABELS[group], fields: grouped.get(group) || [] }));
}

export function normalizeNodeConfig(pkg: NodePackage | undefined, rawConfig: Record<string, unknown> = {}): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...rawConfig };

  if (!pkg) return normalized;

  for (const field of pkg.fields) {
    if (normalized[field.key] === undefined && field.default !== undefined) {
      normalized[field.key] = typeof field.default === 'object' && field.default !== null
        ? JSON.parse(JSON.stringify(field.default))
        : field.default;
    }
  }

  return normalized;
}

export function validateNodeConfig(pkg: NodePackage | undefined, rawConfig: Record<string, unknown> = {}): NodeValidationIssue[] {
  if (!pkg) return [];

  const config = normalizeNodeConfig(pkg, rawConfig);
  const issues: NodeValidationIssue[] = [];

  for (const field of pkg.fields) {
    const value = config[field.key];

    if (field.required && isBlank(value)) {
      issues.push({ fieldKey: field.key, level: 'error', message: `${field.label} is required.` });
      continue;
    }

    if (isBlank(value)) continue;

    if (field.type === 'keyvalue' && !isRecord(value)) {
      issues.push({ fieldKey: field.key, level: 'error', message: `${field.label} must be a key/value object.` });
    }

    if (field.type === 'number' && !looksLikeNumber(value)) {
      issues.push({ fieldKey: field.key, level: 'error', message: `${field.label} must be a valid number.` });
    }

    if (field.dataType === 'json' && typeof value === 'string' && !looksLikeValidJson(value)) {
      issues.push({ fieldKey: field.key, level: 'error', message: `${field.label} must be valid JSON.` });
    }

    if (field.dataType === 'cron' && typeof value === 'string' && !looksLikeCron(value)) {
      issues.push({ fieldKey: field.key, level: 'error', message: `${field.label} must look like a CRON expression.` });
    }

    if (field.dataType === 'url' && typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        issues.push({ fieldKey: field.key, level: 'error', message: `${field.label} must be a valid URL.` });
      }
    }

    if (field.options && field.type === 'select' && typeof value === 'string' && !field.options.includes(value)) {
      issues.push({ fieldKey: field.key, level: 'error', message: `${field.label} must be one of: ${field.options.join(', ')}.` });
    }

    if (field.mapping?.typed && isRecord(value)) {
      for (const [mappingKey, mappingValue] of Object.entries(value)) {
        if (isBlank(mappingKey) || isBlank(mappingValue)) {
          issues.push({ fieldKey: field.key, level: 'error', message: `${field.label} contains an empty mapping entry.` });
          break;
        }
      }
    }
  }

  return issues;
}

export function enrichConfigForPersistence(pkg: NodePackage | undefined, config: Record<string, unknown> = {}): Record<string, unknown> {
  const next = { ...normalizeNodeConfig(pkg, config) };

  if (pkg) {
    next.__nodeMeta = {
      pkgId: pkg.id,
      bpmnType: pkg.bpmnType,
      label: pkg.label
    };
  }

  return next;
}

export function extractAssetContract(configMap: Record<string, any>): AssetContract {
  const inputs = new Set<string>();
  const outputs = new Set<string>();
  const locals = new Set<string>();

  for (const nodeConfig of Object.values(configMap || {})) {
    if (!isRecord(nodeConfig)) continue;

    for (const key of ['variableDefinitions', 'inboundMapping', 'inputMapping']) {
      const mapping = nodeConfig[key];
      if (isRecord(mapping)) {
        for (const name of Object.keys(mapping)) inputs.add(name);
      }
    }

    for (const key of ['outboundMapping', 'outputMapping', 'responseMap']) {
      const mapping = nodeConfig[key];
      if (isRecord(mapping)) {
        for (const name of Object.keys(mapping)) outputs.add(name);
      }
    }

    const localMapping = nodeConfig.localVariables;
    if (isRecord(localMapping)) {
      for (const name of Object.keys(localMapping)) locals.add(name);
    }
  }

  return {
    inputs: [...inputs],
    outputs: [...outputs],
    locals: [...locals]
  };
}
