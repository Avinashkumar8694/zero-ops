import jp from 'jsonpath';
import DependencyResolver from './DependencyResolver.js';
import KIEClient from './KIEClient.js';
import SecretResolver from './SecretResolver.js';

/**
 * Orchestrator coordinates the workflow execution by interpreting the DSL,
 * injecting dynamic tasks into jBPM, and managing the state transition.
 */
class Orchestrator {
  constructor(definition, kieConfig, apiSecrets = {}) {
    this.definition = definition;
    this.kie = new KIEClient(kieConfig);
    this.secrets = new SecretResolver(apiSecrets);
    this.executionState = {
      instanceId: `id_${Date.now()}`,
      processInstanceId: null,
      status: 'RUNNING',
      nodeStatus: {},
      variables: { ...definition.variables }
    };

    // Initialize node status
    definition.steps.forEach(step => {
      this.executionState.nodeStatus[step.id] = 'PENDING';
    });
  }

  /**
   * Main Execution Loop
   */
  async run() {
    console.log(`Starting workflow: ${this.definition.name}`);
    
    // 1. Start Process
    this.executionState.processInstanceId = await this.kie.startProcess('GenericFlow', this.executionState.variables);
    console.log(`jBPM Process Started: ${this.executionState.processInstanceId}`);

    while (!DependencyResolver.isWorkflowComplete(this.definition, this.executionState)) {
      // 2. Resolve Ready Nodes
      const readyNodes = DependencyResolver.getReadyNodes(this.definition, this.executionState);
      
      if (readyNodes.length === 0) {
        // Wait for tasks to complete (Wait-state)
        await this.waitForTaskCompletion();
        continue;
      }

      // 3. Dispatch Ready Nodes
      for (const node of readyNodes) {
        if (this.isInternalNode(node)) {
          await this.handleInternalNode(node);
        } else {
          await this.dispatchExternalNode(node);
        }
      }
    }

    console.log('\nWorkflow Finished Successfully.');
    this.executionState.status = 'COMPLETED';
    return this.executionState;
  }

  isInternalNode(node) {
    return ['XOR_GATEWAY', 'OR_GATEWAY', 'AND_GATEWAY', 'START_EVENT', 'END_EVENT', 'TIMER_EVENT'].includes(node.type);
  }

  async handleInternalNode(node) {
    console.log(`Processing Internal Node: ${node.id} (${node.type})`);
    this.executionState.nodeStatus[node.id] = 'DISPATCHED';

    if (node.type === 'XOR_GATEWAY' || node.type === 'OR_GATEWAY') {
      const activePaths = this.evaluatePaths(node);
      const allPaths = (node.paths || []).map(p => p.target);
      const silencedPaths = allPaths.filter(p => !activePaths.includes(p));

      console.log(`Gateway ${node.id} evaluated. Active: [${activePaths}], Silenced: [${silencedPaths}]`);
      
      // Recursively silence the non-chosen branches
      silencedPaths.forEach(targetId => this.silenceReachableNodes(targetId));
    }

    if (node.type === 'TIMER_EVENT') {
      const duration = node.config.duration || 5000;
      console.log(`Timer ${node.id}: Pausing for ${duration}ms...`);
      await new Promise(resolve => setTimeout(resolve, duration));
    }

    this.executionState.nodeStatus[node.id] = 'COMPLETED';
  }

  /**
   * Recursively marks nodes as SILENCED if they belong to a branch not taken.
   */
  silenceReachableNodes(nodeId) {
    if (this.executionState.nodeStatus[nodeId] !== 'PENDING') return;
    
    console.log(`   - Silencing node: ${nodeId}`);
    this.executionState.nodeStatus[nodeId] = 'SILENCED';
    
    // Find all nodes that depend on this node and recursively silence them
    // only if ALL their dependencies are now silenced.
    this.definition.steps
      .filter(step => step.dependencies && step.dependencies.includes(nodeId))
      .forEach(step => {
        const allDepsSilenced = step.dependencies.every(depId => 
          this.executionState.nodeStatus[depId] === 'SILENCED'
        );
        if (allDepsSilenced) {
          this.silenceReachableNodes(step.id);
        }
      });
  }

  async dispatchExternalNode(node) {
    console.log(`Injecting External Node: ${node.id} (${node.type})`);
    this.executionState.nodeStatus[node.id] = 'DISPATCHED';
    
    try {
      // Resolve variables in config
      const resolvedConfig = this.interpolate(node.config);
      
      await this.kie.injectDynamicTask(this.executionState.processInstanceId, {
        ...node,
        config: resolvedConfig
      });
    } catch (err) {
      if (node.onFailure) {
        console.warn(`Node ${node.id} failed. Diverting to boundary event: ${node.onFailure.target}`);
        this.executionState.nodeStatus[node.id] = 'FAILED';
        // Mark the failure path target as READY (simulated satisfy)
        this.executionState.nodeStatus[node.onFailure.target] = 'PENDING'; 
      } else {
        console.error(`Node ${node.id} failed and no error handler defined. Stopping workflow.`);
        this.executionState.status = 'FAILED';
        throw err;
      }
    }
  }

  evaluatePaths(gateway) {
    const active = [];
    const vars = this.executionState.variables;
    
    for (const path of gateway.paths || []) {
      try {
        // Simple evaluator logic
        const condition = path.condition.replace(/\${(\w+)}/g, (_, name) => `vars.${name}`);
        if (eval(condition)) {
          active.push(path.target);
          if (gateway.type === 'XOR_GATEWAY') break; 
        }
      } catch (err) {
        console.warn(`Condition evaluation failed for ${gateway.id}: ${err.message}`);
      }
    }
    return active;
  }

  interpolate(config) {
    const json = JSON.stringify(config);
    const resolved = json.replace(/\${(\w+)}/g, (_, name) => {
      if (name.startsWith('SECRET_')) {
        return this.secrets.resolve(name) || '***';
      }
      return this.executionState.variables[name] || '';
    });
    return JSON.parse(resolved);
  }

  async waitForTaskCompletion() {
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const tasks = await this.kie.getTasks(this.executionState.processInstanceId);
    for (const task of tasks) {
      if (task.status === 'Completed' && this.executionState.nodeStatus[task.name] === 'DISPATCHED') {
         console.log(`\nNode ${task.name} completed. Syncing outputs...`);
         
         // 1. Fetch Task Output
         const outputs = await this.kie.getTaskOutput(task.id);
         
         // 2. Apply Output Mapping
         const nodeDef = this.definition.steps.find(s => s.id === task.name);
         if (nodeDef && nodeDef.outputMapping) {
           for (const [varName, jsonPath] of Object.entries(nodeDef.outputMapping)) {
             try {
               const value = jp.value(outputs, jsonPath);
               this.executionState.variables[varName] = value;
               console.log(`   - Saved [${varName}] from ${jsonPath}`);
             } catch (e) {
               console.warn(`   - Failed to map ${varName}: ${e.message}`);
             }
           }
         }

         this.executionState.nodeStatus[task.name] = 'COMPLETED';
      }
    }
  }
}

export default Orchestrator;
