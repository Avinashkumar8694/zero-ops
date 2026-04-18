import { WorkflowDefinition, ExecutionState, WorkflowNode } from './types.js';

/**
 * DependencyResolver calculates which nodes in a workflow graph 
 * are ready to be executed based on the completion status of their dependencies.
 * Ported to TypeScript for the Zero-BPM Suite.
 */
class DependencyResolver {
  /**
   * Identifies nodes ready for execution.
   */
  static getReadyNodes(definition: WorkflowDefinition, executionState: ExecutionState): WorkflowNode[] {
    const { nodes } = definition;
    const { nodeStatus } = executionState;

    return nodes.filter(node => {
      // 1. Skip if not IDLE (not already running or finished)
      // Note: Engine uses NodeStatus type. PENDING/IDLE mapping.
      const status = nodeStatus[node.id] || 'IDLE';
      if (status !== 'IDLE') return false;

      // 2. Start node logic
      if (!node.dependencies || node.dependencies.length === 0) {
        return true;
      }

      // 3. Evaluate dependencies
      return node.dependencies.every(depId => 
        nodeStatus[depId] === 'COMPLETED'
      );
    });
  }

  /**
   * Checks if the entire workflow is finished.
   */
  static isWorkflowComplete(definition: WorkflowDefinition, executionState: ExecutionState): boolean {
    return definition.nodes.every(node => 
       executionState.nodeStatus[node.id] === 'COMPLETED' || 
       executionState.nodeStatus[node.id] === 'FAILED'
    );
  }
}

export default DependencyResolver;
