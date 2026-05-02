import Engine from './Engine.js';
import Persistence from './Persistence.js';
import { ExecutionState, WorkflowDefinition, WorkflowNode } from './types.js';
import { applyMapping, compileAssetToWorkflowDefinition } from './runtime.js';

function findStartNode(definition: WorkflowDefinition): WorkflowNode | undefined {
  return definition.nodes.find(node => node.type === 'start-event' || node.type === 'StartEvent');
}

function findWaitingNode(definition: WorkflowDefinition, state: ExecutionState): WorkflowNode | undefined {
  return definition.nodes.find(node => state.nodeStatus[node.id] === 'WAITING');
}

class EngineRunner {
  static async startAsset(asset: any, triggerContext: Record<string, any>, config: any = {}) {
    const definition = compileAssetToWorkflowDefinition(asset);
    const startNode = findStartNode(definition);
    const inboundValues = applyMapping(
      startNode?.config?.inboundMapping,
      { input: triggerContext, process: definition.variables },
      'input'
    );

    const initialVariables = {
      ...(definition.variables || {}),
      ...inboundValues
    };

    const engine = new Engine(definition, definition.namespace || 'default', {
      ...config,
      initialVariables,
      owner: config.owner,
      metadata: {
        ...(config.metadata || {}),
        triggerContext,
        assetName: asset.workflow_name,
        assetVersion: asset.version,
        assetProject: asset.project_name || config.projectName || null
      }
    });

    const state = await engine.run();
    const immediateOutput = applyMapping(
      startNode?.config?.outboundMapping,
      { process: state.variables, input: triggerContext, output: state.metadata?.finalOutput || {} },
      'process'
    );

    return {
      definition,
      state,
      immediateOutput
    };
  }

  static async hydrateForInstance(instanceId: string, config: any = {}) {
    const persistence = new Persistence(config.db || {});
    try {
      const details = await persistence.getInstanceDetails(instanceId);
      if (!details) throw new Error(`Process instance '${instanceId}' was not found.`);

      const definition = compileAssetToWorkflowDefinition(details);
      const nodeStatus = await persistence.getNodeStatusSnapshot(instanceId);
      const state: ExecutionState = {
        instanceId,
        status: details.status,
        nodeStatus,
        variables: details.variables || {},
        metadata: details.metadata || {}
      };

      return {
        persistence,
        details,
        definition,
        state
      };
    } catch (err) {
      await persistence.shutdown();
      throw err;
    }
  }

  static async completeTask(taskId: number, payload: Record<string, any>, config: any = {}) {
    const persistence = new Persistence(config.db || {});
    try {
      const task = await persistence.getTaskById(taskId);
      if (!task) throw new Error(`Task '${taskId}' was not found.`);

      const details = await persistence.getInstanceDetails(task.instance_id);
      if (!details) throw new Error(`Task '${taskId}' references missing instance '${task.instance_id}'.`);

      const definition = compileAssetToWorkflowDefinition(details);
      const state: ExecutionState = {
        instanceId: task.instance_id,
        status: details.status,
        nodeStatus: await persistence.getNodeStatusSnapshot(task.instance_id),
        variables: details.variables || {},
        metadata: details.metadata || {}
      };

      const waitingNode = definition.nodes.find(node => node.id === task.node_id);
      if (!waitingNode) throw new Error(`Task node '${task.node_id}' no longer exists in the workflow definition.`);

      const mappedOutputs = applyMapping(
        waitingNode.config?.outputMapping,
        { task: payload, process: state.variables, input: state.metadata?.triggerContext || {} },
        'task'
      );

      await persistence.completeTask(taskId, payload, config.completedBy || null);

      const engine = new Engine(definition, definition.namespace || 'default', {
        ...config,
        existingState: state,
        owner: details.owner,
        metadata: details.metadata || {}
      });

      await engine.completeNodeManually(waitingNode.id, mappedOutputs);
      const resumed = await engine.run();

      return {
        task,
        state: resumed
      };
    } finally {
      await persistence.shutdown();
    }
  }

  static async signalInstance(instanceId: string, signalName: string, payload: Record<string, any>, config: any = {}) {
    const hydrated = await EngineRunner.hydrateForInstance(instanceId, config);
    try {
      const waitingNode = findWaitingNode(hydrated.definition, hydrated.state);
      if (!waitingNode) {
        throw new Error(`Instance '${instanceId}' is not currently waiting for an external signal.`);
      }

      const expectedSignal = waitingNode.config?.messageName || waitingNode.config?.messageTopic || waitingNode.config?.signalName;
      if (expectedSignal && expectedSignal !== signalName) {
        throw new Error(`Instance '${instanceId}' is waiting for '${expectedSignal}', not '${signalName}'.`);
      }

      const engine = new Engine(hydrated.definition, hydrated.definition.namespace || 'default', {
        ...config,
        existingState: hydrated.state,
        owner: hydrated.details.owner,
        metadata: {
          ...(hydrated.details.metadata || {}),
          lastSignal: {
            signalName,
            payload
          }
        }
      });

      await engine.completeNodeManually(waitingNode.id, payload || {});
      const resumed = await engine.run();

      return {
        waitingNodeId: waitingNode.id,
        state: resumed
      };
    } finally {
      await hydrated.persistence.shutdown();
    }
  }
}

export default EngineRunner;
