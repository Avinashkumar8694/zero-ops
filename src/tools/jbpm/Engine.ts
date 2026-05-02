import Persistence from './Persistence.js';
import DependencyResolver from './DependencyResolver.js';
import SecretResolver from './SecretResolver.js';
import { WorkflowDefinition, ExecutionState, WorkflowNode } from './types.js';
import { NODE_REGISTRY, ActionContext } from './nodes/index.js';
import { applyMapping } from './runtime.js';

class Engine {
  private definition: WorkflowDefinition;
  private namespace: string;
  private persistence: Persistence;
  private secrets: SecretResolver;
  private executionState: ExecutionState;
  private owner: string;
  private skipShutdown: boolean;

  constructor(definition: WorkflowDefinition, namespace: string = 'default', config: any = {}) {
    this.definition = definition;
    this.namespace = namespace;
    this.persistence = new Persistence(config.db || {});
    this.secrets = new SecretResolver(config.apiSecrets || {});
    this.owner = config.owner || 'admin';
    this.skipShutdown = Boolean(config.skipShutdown);
    
    this.executionState = config.existingState || {
      instanceId: config.instanceId || `id_${Date.now()}`,
      status: 'RUNNING',
      nodeStatus: {},
      variables: { ...(config.initialVariables || definition.variables) },
      metadata: config.metadata || {}
    };
  }

  /**
   * Main execution loop for the Zero-BPM engine.
   */
  async run(): Promise<ExecutionState> {
    console.log(`[Zero-BPM] Starting workflow: ${this.definition.name} in namespace: ${this.namespace}`);
    
    // 1. Initialize Persistence
    if (this.executionState.status === 'RUNNING' && Object.keys(this.executionState.nodeStatus || {}).length > 0) {
      await this.persistence.updateInstanceStatus(this.executionState.instanceId, 'RUNNING');
      await this.persistence.updateInstanceVariables(this.executionState.instanceId, this.executionState.variables);
      await this.persistence.updateInstanceMetadata(this.executionState.instanceId, this.executionState.metadata || {});
    } else {
      await this.persistence.createInstance(
        this.executionState.instanceId,
        this.definition.name,
        this.namespace,
        this.executionState.variables,
        this.owner
      );
      if (this.executionState.metadata) {
        await this.persistence.updateInstanceMetadata(this.executionState.instanceId, this.executionState.metadata);
      }
      for (const [name, value] of Object.entries(this.executionState.variables || {})) {
        await this.persistence.logVariable(this.executionState.instanceId, name, value);
      }
    }

    // 2. Log Start Event
    if (!this.executionState.nodeStatus.__engine_start) {
      await this.persistence.logNode(this.executionState.instanceId, { id: 'start', type: 'START_EVENT' }, 'ENTERED');
      this.executionState.nodeStatus.__engine_start = 'COMPLETED' as any;
    }

    while (!DependencyResolver.isWorkflowComplete(this.definition, this.executionState)) {
      const readyNodes = DependencyResolver.getReadyNodes(this.definition, this.executionState);

      if (readyNodes.length === 0) {
        if (this.isWaiting()) {
          this.executionState.status = 'RUNNING' as any;
          await this.persistence.updateInstanceStatus(this.executionState.instanceId, 'WAITING');
          await this.persistence.updateInstanceVariables(this.executionState.instanceId, this.executionState.variables);
          await this.persistence.updateInstanceMetadata(this.executionState.instanceId, this.executionState.metadata || {});
          if (!this.skipShutdown) await this.persistence.shutdown();
          return this.executionState;
        }

        console.error('[Zero-BPM] Deadlock detected or all paths exhausted.');
        this.executionState.status = 'ERROR';
        await this.persistence.updateInstanceStatus(this.executionState.instanceId, 'ERROR');
        break;
      }

      for (const node of readyNodes) {
        await this.executeNode(node);
        if (this.isWaiting()) {
          await this.persistence.updateInstanceStatus(this.executionState.instanceId, 'WAITING');
          await this.persistence.updateInstanceVariables(this.executionState.instanceId, this.executionState.variables);
          await this.persistence.updateInstanceMetadata(this.executionState.instanceId, this.executionState.metadata || {});
          if (!this.skipShutdown) await this.persistence.shutdown();
          return this.executionState;
        }
      }

      // Heartbeat
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.executionState.status = this.executionState.status === 'ERROR' ? 'ERROR' : 'COMPLETED';
    if (this.executionState.status === 'COMPLETED') {
      await this.persistence.completeInstance(this.executionState.instanceId);
    }
    if (!this.skipShutdown) await this.persistence.shutdown();
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

      if (node.type === 'CALL_ACTIVITY' || typeKey === 'bpmn:CallActivity' || node.type === 'call-activity') {
        await this.executeCallActivity(node);
      }
      else if (typeKey === 'bpmn:EndEvent' || node.type === 'end-event' || node.type === 'EndEvent') {
        const finalOutput = applyMapping(node.config?.outputMapping, { process: this.executionState.variables }, 'process');
        this.executionState.metadata = {
          ...(this.executionState.metadata || {}),
          finalOutput
        };
        await this.completeNodeManually(node.id, {});
      }
      else if (typeKey === 'bpmn:ReceiveTask' || node.type === 'receive-task' || node.type === 'ReceiveTask') {
        await this.enterSignalWaitState(node);
      }
      else if (pkg && pkg.action) {
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
            await this.enterUserTaskWaitState(node, result.output);
          } else {
            await this.completeNodeManually(node.id, result.output || {});
          }
        } else {
          throw new Error(result.error || 'Execution failure');
        }
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
    await this.persistence.updateInstanceMetadata(this.executionState.instanceId, this.executionState.metadata || {});
  }

  private isWaiting(): boolean {
    return Object.values(this.executionState.nodeStatus).some(status => status === 'WAITING' || status === 'DISPATCHED');
  }

  private async enterUserTaskWaitState(node: WorkflowNode, output: Record<string, any> = {}) {
    const candidateGroups = String(node.config?.candidateGroups || '')
      .split(',')
      .map((item: string) => item.trim())
      .filter(Boolean);
    const priorityMap: Record<string, number> = { LOW: 1, NORMAL: 2, HIGH: 3, CRITICAL: 4 };
    const formData = applyMapping(node.config?.inputMapping, { process: this.executionState.variables }, 'process');
    const task = await this.persistence.createTask(this.executionState.instanceId, node.id, {
      assignee: output._assignee || node.config?.assignee || null,
      potentialGroups: candidateGroups,
      priority: priorityMap[String(node.config?.priority || 'NORMAL')] || 2,
      formData: {
        ...(formData || {}),
        formKey: node.config?.formKey || null
      }
    });

    this.executionState.nodeStatus[node.id] = 'WAITING' as any;
    this.executionState.metadata = {
      ...(this.executionState.metadata || {}),
      waiting: {
        kind: 'USER_TASK',
        nodeId: node.id,
        taskId: task.id
      }
    };

    await this.persistence.logNode(this.executionState.instanceId, node, 'WAITING', `Task ${task.id} created`);
  }

  private async enterSignalWaitState(node: WorkflowNode) {
    this.executionState.nodeStatus[node.id] = 'WAITING' as any;
    this.executionState.metadata = {
      ...(this.executionState.metadata || {}),
      waiting: {
        kind: 'SIGNAL',
        nodeId: node.id,
        signalName: node.config?.messageName || node.config?.messageTopic || node.config?.signalName || null
      }
    };

    await this.persistence.logNode(this.executionState.instanceId, node, 'WAITING', `Waiting for signal ${node.config?.messageName || node.config?.messageTopic || node.config?.signalName || 'UNSPECIFIED'}`);
  }

  private async executeCallActivity(node: WorkflowNode): Promise<void> {
    const targetProcess = node.config?.targetProcess || node.config?.subProcessId;
    if (!targetProcess) {
      throw new Error(`Call activity '${node.id}' is missing targetProcess.`);
    }

    this.executionState.nodeStatus[node.id] = 'DISPATCHED';
    await this.persistence.logNode(this.executionState.instanceId, node, 'ENTERED', `Invoking child process ${targetProcess}`);

    const parentProject = this.executionState.metadata?.assetProject || null;
    const asset = parentProject
      ? await this.persistence.getLatestAssetByProjectAndName(parentProject, targetProcess)
      : await this.persistence.getLatestAssetByName(targetProcess);
    if (!asset) {
      throw new Error(`Target process '${targetProcess}' was not found.`);
    }

    const childDefinition = this.resolveChildDefinition(asset, node);
    const childInputs = this.buildMappedVariables(node.config?.inputMapping, this.executionState.variables, 'input');
    childDefinition.variables = {
      ...(childDefinition.variables || {}),
      ...childInputs
    };

    const ChildEngine = (await import('./Engine.js')).default;
    const childEngine = new ChildEngine(childDefinition, this.namespace, {
      db: {},
      owner: this.owner,
      metadata: {
        parentInstanceId: this.executionState.instanceId,
        parentNodeId: node.id,
        assetName: asset.workflow_name,
        assetVersion: asset.version,
        assetProject: asset.project_name || this.executionState.metadata?.assetProject || null
      }
    });
    const childState = await childEngine.run();

    const mappedOutputs = this.buildMappedVariables(node.config?.outputMapping, childState.variables || {}, 'output');
    const shouldWait = String(node.config?.waitForCompletion ?? 'true') !== 'false';

    if (!shouldWait) {
      await this.completeNodeManually(node.id, {});
      return;
    }

    await this.completeNodeManually(node.id, mappedOutputs);
  }

  private resolveChildDefinition(asset: any, node: WorkflowNode): WorkflowDefinition {
    if (asset?.nodes && Array.isArray(asset.nodes)) {
      return asset as WorkflowDefinition;
    }

    if (asset?.json_config?.nodes && Array.isArray(asset.json_config.nodes)) {
      return asset.json_config as WorkflowDefinition;
    }

    throw new Error(
      `Target process '${node.config?.targetProcess || node.config?.subProcessId}' is deployed as a design asset but not yet as an executable workflow definition.`
    );
  }

  private buildMappedVariables(
    mapping: Record<string, any> | undefined,
    sourceVariables: Record<string, any>,
    defaultScope: 'input' | 'output' | 'process' = 'process'
  ): Record<string, any> {
    return applyMapping(mapping, { process: sourceVariables, input: sourceVariables, output: sourceVariables }, defaultScope);
  }
}

export default Engine;
