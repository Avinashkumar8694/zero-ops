/**
 * ZERO-BPM Core Type Definitions
 */

export type NodeStatus = 'IDLE' | 'DISPATCHED' | 'COMPLETED' | 'FAILED';

export interface WorkflowNode {
  id: string;
  name?: string;
  type: string;
  dependencies?: string[];
  config: any;
  inputs?: Record<string, string>;
  outputMapping?: Record<string, string>;
}

export interface WorkflowDefinition {
  name: string;
  namespace?: string;
  version: string;
  variables: Record<string, any>;
  nodes: WorkflowNode[];
}

export interface ExecutionState {
  instanceId: string;
  processInstanceId?: string | number; // For compatibility
  status: 'RUNNING' | 'COMPLETED' | 'ERROR' | 'ABORTED';
  nodeStatus: Record<string, NodeStatus>;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PersistenceConfig {
  user?: string;
  host?: string;
  database?: string;
  password?: string;
  port?: number;
}

export interface KIEConfig {
  baseURL: string;
  username: string;
  password?: string;
  containerId: string;
}

export interface ReleaseId {
  'group-id': string;
  'artifact-id': string;
  'version': string;
}
