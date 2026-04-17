# Low-Level Design: Generic Flow Interpreter (Final v4.0)

This document is the definitive technical specification for the Zero-Flow orchestration engine, supporting the full BPMN 2.0 palette with enterprise hardening.

---

## 1. Core Data Models

### 1.1 `WorkflowDefinition` (The JSON DSL)
```typescript
interface WorkflowDefinition {
  name: string;
  version: string;
  variables: Record<string, any>;
  steps: Step[];
}

type StepType = 
  | 'REST' | 'SCRIPT' | 'RULE' | 'USER' | 'EMAIL' | 'MILESTONE'
  | 'XOR_GATEWAY' | 'AND_GATEWAY' | 'OR_GATEWAY'
  | 'START_EVENT' | 'END_EVENT' | 'TIMER_EVENT' | 'SIGNAL_EVENT' | 'MESSAGE_EVENT'
  | 'CALL_ACTIVITY' | 'ERROR_BOUNDARY' | 'COMPENSATION'
  | 'SEND_TASK' | 'RECEIVE_TASK' | 'MANUAL_TASK' | 'BUSINESS_RULE_TASK';

interface Step {
  id: string;
  type: StepType;
  dependencies: string[]; // List of IDs node must wait for
  joinType?: 'AND' | 'XOR'; // How to evaluate incoming dependencies 
  config: Record<string, any>; // Node-specific parameters
  outputMapping?: Record<string, string>; // { "varName": "$.jsonPath" }
  
  // Conditional Routing (for Gateways)
  paths?: Array<{
    target: string;
    condition: string; // Javascript expression using variables
  }>;
  
  // Error Handling (for Boundary Events)
  onFailure?: {
    target: string;
    errorCode?: string;
  };
}
```

---

## 2. Advanced Orchestration Logic

### 2.1 The Dependency Resolver (Synchronous Join)
The resolver determines node readiness based on the `joinType`:
- **AND (Default)**: `dependency.every(status === COMPLETED || status === SILENCED)`
- **XOR**: `dependency.some(status === COMPLETED)`

### 2.2 Branch Silencing (Deadlock Prevention)
When an XOR gateway activates a path, the orchestrator recursively marks all nodes on the *other* branches as `SILENCED`. This allows downstream AND-joins to acknowledge that those inputs will never arrive, preventing wait-states from hanging.

### 2.3 Secret Resolution (Tiered)
The engine resolves `${SECRET_...}` tokens using a 3-tiered lookup:
1. **API State**: Secrets passed in-memoery at runtime.
2. **`secret.json`**: Local configuration file.
3. **OS Env**: System environment variables (`process.env`).

---

## 3. Communication Bridge (Extended)

### 3.1 Universal Handler (Java)
The Java side implements a functional, high-performance executor:
- **REST**: Functional `HttpURLConnection` client supporting custom headers, verbs, and body data.
- **Compensation**: Transactional rollback protocol for undoing previously completed tasks.
- **Data Pass-back**: All task results are returned to the orchestrator as a Map for variable synchronization.

---

## 4. Observability Pipeline
Every task injection and execution result is logged and traced via **Jaeger**, providing a distributed trace of the entire dynamic process across the Node.js orchestrator and the Java jBPM runtime.
