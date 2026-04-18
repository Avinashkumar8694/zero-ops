import Persistence from './Persistence.js';
import DependencyResolver from './DependencyResolver.js';
import SecretResolver from './SecretResolver.js';
import { WorkflowDefinition, ExecutionState, WorkflowNode } from './types.js';
import { NODE_REGISTRY, ActionContext } from './nodes/index.js';

class Engine {
  private definition: WorkflowDefinition;
  private namespace: string;
  private persistence: Persistence;
  private secrets: SecretResolver;
  private executionState: ExecutionState;

  constructor(definition: WorkflowDefinition, namespace: string = 'default', config: any = {}) {
    this.definition = definition;
    this.namespace = namespace;
    this.persistence = new Persistence(config.db || {});
    this.secrets = new SecretResolver(config.apiSecrets || {});
    
    this.executionState = {
      instanceId: `id_${Date.now()}`,
      status: 'RUNNING',
      nodeStatus: {},
      variables: { ...definition.variables }
    };
  }

  /**
   * Main execution loop for the Zero-BPM engine.
   */
  async run(): Promise<ExecutionState> {
    console.log(`[Zero-BPM] Starting workflow: ${this.definition.name} in namespace: ${this.namespace}`);
    
    // 1. Initialize Persistence
    await this.persistence.createInstance(
      this.executionState.instanceId, 
      this.definition.name, 
      this.namespace,
      this.executionState.variables
    );

    // 2. Log Start Event
    await this.persistence.logNode(this.executionState.instanceId, { id: 'start', type: 'START_EVENT' }, 'ENTERED');

    while (!DependencyResolver.isWorkflowComplete(this.definition, this.executionState)) {
      const readyNodes = DependencyResolver.getReadyNodes(this.definition, this.executionState);

      if (readyNodes.length === 0 && !this.isWaiting()) {
        console.error('[Zero-BPM] Deadlock detected or all paths exhausted.');
        break;
      }

      for (const node of readyNodes) {
        await this.executeNode(node);
      }

      // Heartbeat
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await this.persistence.completeInstance(this.executionState.instanceId);
    await this.persistence.shutdown();
    console.log(`\n[Zero-BPM] Workflow '${this.definition.name}' completed successfully.`);
    return this.executionState;
  }

  /**
   * Orchestrates the execution of a specific node using the Modular Registry (V6.5).
   */
  async executeNode(node: WorkflowNode): Promise<void> {
    this.executionState.nodeStatus[node.id] = 'DISPATCHED';
    await this.persistence.logNode(this.executionState.instanceId, node, 'ENTERED');

    console.log(`\n[Zero-BPM] Dispatching node: ${node.id} (${node.type})`);

    try {
      // 1. Resolve Node Package from Registry
      const typeKey = node.type.includes(':') ? node.type : `bpmn:${node.type}`;
      const pkg = NODE_REGISTRY[typeKey];

      if (pkg && pkg.action) {
        const ctx: ActionContext = {
          instanceId: this.executionState.instanceId,
          variables: this.executionState.variables,
          config: node.config,
          logger: (msg) => console.log(`[Zero-BPM] [${node.id}] ${msg}`),
          secrets: (key) => this.secrets.getSecret(key)
        };

        const result = await pkg.action(ctx);

        if (result.success) {
          if (result.output && result.output._task_status === 'WAITING') {
            this.executionState.nodeStatus[node.id] = 'WAITING';
          } else {
            await this.completeNodeManually(node.id, result.output || {});
          }
        } else {
          throw new Error(result.error || 'Execution failure');
        }
      } 
      else if (node.type === 'CALL_ACTIVITY') {
        const subProcessId = node.config?.subProcessId;
        this.executionState.nodeStatus[node.id] = 'CALLING';
        const subDef = await this.persistence.getAsset(subProcessId, this.namespace);
        const ChildEngine = (await import('./Engine.js')).default;
        const childEngine = new ChildEngine(subDef, this.namespace, { db: {} });
        const childState = await childEngine.run();
        await this.completeNodeManually(node.id, childState.variables);
      }
      else {
        // Fallback for untyped/structural nodes
        this.executionState.nodeStatus[node.id] = 'COMPLETED';
        await this.persistence.logNode(this.executionState.instanceId, node, 'COMPLETED');
      }
    } catch (err: any) {
      this.executionState.nodeStatus[node.id] = 'FAILED';
      await this.persistence.logNode(this.executionState.instanceId, node, 'FAILED', err.message);
      throw err;
    }
  }

  async completeNodeManually(nodeId: string, output: Record<string, any> = {}): Promise<void> {
    this.executionState.nodeStatus[nodeId] = 'COMPLETED';
    await this.persistence.logNode(this.executionState.instanceId, { id: nodeId }, 'COMPLETED');
    
    for (const [key, value] of Object.entries(output)) {
      this.executionState.variables[key] = value;
      await this.persistence.logVariable(this.executionState.instanceId, key, value);
    }
    
    await this.persistence.updateInstanceVariables(this.executionState.instanceId, this.executionState.variables);
  }

  private isWaiting(): boolean {
    return Object.values(this.executionState.nodeStatus).some(status => status === 'WAITING' || status === 'DISPATCHED');
  }
}

export default Engine;
