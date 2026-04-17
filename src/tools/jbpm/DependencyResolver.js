/**
 * DependencyResolver calculates which nodes in a workflow graph 
 * are ready to be executed based on the completion status of their dependencies.
 */
class DependencyResolver {
  /**
   * @param {Object} definition - The Workflow JSON DSL
   * @param {Object} executionState - Current status and results of nodes
   * @returns {Array} List of nodes ready for execution
   */
  static getReadyNodes(definition, executionState) {
    const { steps } = definition;
    const { nodeStatus } = executionState;

    return steps.filter(step => {
      // 1. Skip if not pending (already running or finished)
      if (nodeStatus[step.id] !== 'PENDING') return false;

      // 3. Evaluate based on Join Type (default: AND)
      const joinType = step.joinType || 'AND';
      
      if (joinType === 'XOR') {
        // Trigger as soon as ANY dependency is COMPLETED
        return step.dependencies.some(depId => 
          nodeStatus[depId] === 'COMPLETED'
        );
      } else {
        // AND Join: All dependencies must be COMPLETED
        // OR Silenced (skipped by an upstream gateway)
        return step.dependencies.every(depId => 
          nodeStatus[depId] === 'COMPLETED' || nodeStatus[depId] === 'SILENCED'
        );
      }
    });
  }

  /**
   * Checks if the entire workflow is finished.
   */
  static isWorkflowComplete(definition, executionState) {
    return definition.steps.every(step => 
       executionState.nodeStatus[step.id] === 'COMPLETED' || 
       executionState.nodeStatus[step.id] === 'FAILED'
    );
  }
}

export default DependencyResolver;
