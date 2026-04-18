# Sub-Orchestration (Call Activity) (V1.0.0)

Modular primitive for reusable process invocation.

## Overview
The Call Activity node allows the current process to invoke another independent BPMN process as a service. It is the primary tool for modularizing large-scale orchestrations. Unlike a sub-process, the child process has its own lifecycle and can be called by multiple parent flows.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `subProcessId` | The ID of the process definition to invoke. | Text |
| `variableMapping` | Mapping of variables between parent and child scopes. | Key-Value |

## Data Movement
1. **Invocation**: Spawns a new instance of the child process.
2. **Synchronization**: The parent thread waits for the child to reach a terminal state.
3. **Data Return**: Mapping results from the child back to the parent variable pool.

## Example: KYC Verification
- `subProcessId`: `GLOBAL_KYC_V1`
- Parents like "Account Open" or "Loan Application" can all call this module.
