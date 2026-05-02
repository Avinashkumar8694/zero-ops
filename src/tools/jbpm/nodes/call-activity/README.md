# Call Activity

Reusable subprocess invocation for one process calling another.

## What This Node Does
Starts a child process from a parent process.

Use this node when you want:
- reusable workflow modules
- clear parent-child contracts
- shared business capabilities used by multiple processes
- separation between main flow and specialized subflows

Examples:
- KYC subprocess
- payment validation subprocess
- fraud screening subprocess
- approval subprocess
- case enrichment subprocess

In business terms:
- parent process sends data into child process
- child process runs independently
- parent may wait or continue
- child returns output back to parent when applicable

## Properties
- `name`: Display label for the call step.
- `targetProcess`: Name of the target process asset to invoke.
- `waitForCompletion`: `true` to block until the child finishes, `false` to continue asynchronously.
- `inputMapping`: Maps parent process variables into the child process input contract.
- `outputMapping`: Maps child outputs back into the parent process scope.

## Think About It In 3 Layers
### 1. Parent Process Layer
This is the current workflow state before the child is called.

Examples:
- `customerId`
- `countryCode`
- `requestId`
- `caseId`

### 2. Child Process Contract Layer
This is what the child process expects as input and what it returns as output.

Examples:
- child input: `customerId`, `country`, `documentId`
- child output: `riskScore`, `kycStatus`, `screeningResult`

### 3. Parent Resume Layer
This is what the parent does after the child completes or after it continues asynchronously.

Examples:
- `riskScore` -> `customerRiskScore`
- `kycStatus` -> `kycStatus`
- `screeningResult` -> `fraudDecision`

## How It Works
When the process reaches a call activity:
1. the engine creates a child process instance
2. `inputMapping` passes parent values into the child contract
3. the child process starts from its own start node
4. the child runs until completion or wait state
5. if `waitForCompletion = true`, the parent waits
6. if `waitForCompletion = false`, the parent continues immediately
7. when child output is available, `outputMapping` may write it back into parent variables

## Wait For Completion: Business Meaning
### `waitForCompletion = true`
Use this when the parent depends on the child result before it can continue.

Examples:
- risk score must be known before approval
- KYC result must be known before account opening
- pricing result must be known before final response

Behavior:
- parent pauses while child runs
- parent resumes only after child completes
- child `End Event.outputMapping` becomes available to parent `outputMapping`

### `waitForCompletion = false`
Use this when the child should run independently and the parent does not need to block.

Examples:
- start notification subprocess in background
- create audit subprocess asynchronously
- launch parallel operational flow

Behavior:
- parent continues immediately
- child still runs as a linked instance
- output may not be available for immediate parent use

## Mapping Behavior
### `inputMapping`
Maps parent process variables into the child start/input contract.

Typical source styles:
- parent variable: `customerId`
- variable expression: `${variables.customerId}`
- static literal: `"INDIA"`, `true`, `0`

Typical targets:
- child input names such as `customerId`, `country`, `requestId`

### `outputMapping`
Maps child outputs back into parent process variables.

Typical sources:
- child output contract values from the child end node

Typical targets:
- parent variables such as `kycStatus`, `customerRiskScore`, `verificationResult`

## Example
```json
{
  "name": "Run KYC Subprocess",
  "targetProcess": "KYC-Validation",
  "waitForCompletion": "true",
  "inputMapping": {
    "customerId": {
      "target": "customerId",
      "type": "string",
      "sourceScope": "process",
      "targetScope": "input"
    },
    "countryCode": {
      "target": "country",
      "type": "string",
      "sourceScope": "process",
      "targetScope": "input"
    }
  },
  "outputMapping": {
    "riskScore": {
      "target": "customerRiskScore",
      "type": "number",
      "sourceScope": "output",
      "targetScope": "process"
    },
    "kycStatus": {
      "target": "kycStatus",
      "type": "string",
      "sourceScope": "output",
      "targetScope": "process"
    }
  }
}
```

## Parent / Child Contract Example
### Parent Variables Before Call
```json
{
  "customerId": "C100",
  "countryCode": "IN"
}
```

### Child Receives
```json
{
  "customerId": "C100",
  "country": "IN"
}
```

### Child Ends With
```json
{
  "riskScore": 72,
  "kycStatus": "CLEAR"
}
```

### Parent Variables After Output Mapping
```json
{
  "customerId": "C100",
  "countryCode": "IN",
  "customerRiskScore": 72,
  "kycStatus": "CLEAR"
}
```

## End-To-End Business Scenarios
### Synchronous Reusable Validation
Use when the parent needs the child result immediately.

Example:
- order process calls pricing subprocess
- pricing subprocess completes quickly
- parent reads returned quote
- parent continues to final response

Recommended setup:
- `waitForCompletion = true`
- explicit child start and end contracts
- explicit parent `inputMapping` and `outputMapping`

### Asynchronous Auxiliary Process
Use when the child is supportive but not blocking.

Example:
- primary case process continues
- audit subprocess runs separately
- notification subprocess runs separately

Recommended setup:
- `waitForCompletion = false`
- child performs auxiliary work
- parent does not depend on child outputs immediately

### Child With Human Tasks Or Wait States
Use when the child itself contains approvals, receive tasks, or signals.

Behavior:
- if `waitForCompletion = true`, parent also effectively waits
- child may pause at its own user task or signal wait
- parent resumes only when child reaches completion

Business meaning:
- the child subprocess becomes part of the parent’s long-running lifecycle

## How It Relates To Start And End Nodes
The child process should define:
- its input contract in the child start node
- its output contract in the child end node

That means:
- parent `inputMapping` should align with child `Start Event.inboundMapping`
- parent `outputMapping` should align with child `End Event.outputMapping`

This is the cleanest future-proof subprocess design.

## Process Instance View Meaning
At runtime, call activity should create:
- parent instance
- child instance
- explicit parent-child linkage

Operational views should ideally show:
- root parent process
- child subprocess under the parent
- nested child status
- child errors and completion state

## Validation Notes
- `name` and `targetProcess` are required.
- Mapping rows must be complete on both sides.
- Target process contracts should be discoverable from the referenced asset.

## Practical Recommendations
- design the child process as a real reusable business capability
- keep child input/output contract stable
- use `waitForCompletion = true` only when the parent truly depends on the result
- prefer explicit mapping names over generic keys such as `data` or `value`
- make the child start and end nodes the official contract, not hidden internal variables

## Runtime Meaning
This node should create a parent-child instance relationship. If `waitForCompletion` is `true`, the parent should resume only after the child finishes and output mappings are applied.
