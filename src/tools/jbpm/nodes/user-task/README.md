# User Task

Human work item for approvals, reviews, data entry, or decision capture.

## What This Node Does
Creates a runtime task for a user or group and pauses the process until human work is completed.

This is the main node to use when:
- a person must review data
- a manager must approve or reject
- an analyst must enter missing values
- an operator must choose the next action

In business terms:
- the process becomes active but waiting
- a task appears in inbox/worklist views
- a user claims and completes the task
- task output is mapped back into process variables
- the process continues from there

## When To Use It
- approval workflow
- exception handling
- manual review
- business data correction
- user decision capture
- supervisor override

## Properties
- `name`: Task label shown to users.
- `assignee`: Specific user, role expression, or variable-driven actor.
- `candidateGroups`: Groups that may claim the task.
- `formKey`: Identifier for the form or UI component used to complete the task.
- `priority`: `LOW`, `NORMAL`, `HIGH`, or `CRITICAL`.
- `inputMapping`: Maps process variables into task-local form data.
- `outputMapping`: Maps submitted task values back into process variables.

## Think About It In 3 Layers
### 1. Process Variable Layer
This is the data the workflow already has before the task starts.

Examples:
- `customerId`
- `amount`
- `requestId`
- `currentRisk`
- `approvalRequired`

### 2. Task Form Layer
This is the data shown to the human user.

Examples:
- `requestAmount`
- `requesterEmail`
- `riskSummary`
- `decision`
- `comments`

### 3. Process Resume Layer
After the user completes the task, selected form fields are mapped back into process variables.

Examples:
- `decision` -> `approved`
- `comments` -> `approvalComment`
- `nextAction` -> `routingDecision`

## How Waiting Works
When the process reaches a user task:
1. the engine creates a task record
2. the task is assigned or made claimable
3. the process pauses
4. the instance stays in a waiting state
5. the task appears in task APIs and inbox screens
6. once the task is completed, the process resumes

Important:
- the process does not fail here
- the process does not complete here
- it is waiting for human response

## How The Process Resumes
The process should continue only after the task is completed.

Typical runtime flow:
1. process starts
2. `User Task` is reached
3. task is created
4. user claims the task if needed
5. user submits form data
6. `outputMapping` writes task values back into process variables
7. workflow continues to the next node

Typical APIs:
- `GET /api/engine/tasks`
- `POST /api/engine/tasks/:taskId/claim`
- `POST /api/engine/tasks/:taskId/complete`
- `POST /api/engine/tasks/:taskId/reassign`

Practical meaning:
- `claim` reserves the work
- `complete` is what actually moves the process forward

## Assignment Scenarios
### Specific Assignee
Use when exactly one user should receive the task.

Example:
```json
{
  "assignee": "${variables.managerId}"
}
```

Meaning:
- the process variable `managerId` decides who receives the task

### Candidate Groups
Use when a shared team should see the task and one person will claim it.

Example:
```json
{
  "candidateGroups": "FINANCE,MANAGERS"
}
```

Meaning:
- task appears in worklists for those groups
- one eligible user claims it
- that user completes it

### Mixed Pattern
Use when both direct assignment and pooled eligibility are needed.

Example:
- `assignee` for preferred owner
- `candidateGroups` for fallback/shared visibility

## Mapping Behavior
### `inputMapping`
Maps process variables into task form values.

Use this to decide what the user sees.

Examples:
- `amount` -> `requestAmount`
- `customerEmail` -> `requesterEmail`
- `${variables.currentRisk}` -> `riskSummary`

### `outputMapping`
Maps task-submitted values back into process variables.

Use this to decide what the workflow learns from the user.

Examples:
- `decision` -> `approved`
- `comments` -> `approvalComment`
- `nextAction` -> `routingDecision`
- `"REVIEWED"` -> `reviewStatus`

## Example
```json
{
  "name": "Manager Approval",
  "assignee": "${variables.managerId}",
  "candidateGroups": "FINANCE,MANAGERS",
  "formKey": "approval-v1",
  "priority": "HIGH",
  "inputMapping": {
    "amount": {
      "target": "requestAmount",
      "type": "number",
      "sourceScope": "process",
      "targetScope": "task"
    },
    "customerEmail": {
      "target": "requesterEmail",
      "type": "string",
      "sourceScope": "process",
      "targetScope": "task"
    }
  },
  "outputMapping": {
    "decision": {
      "target": "approved",
      "type": "boolean",
      "sourceScope": "task",
      "targetScope": "process"
    },
    "comments": {
      "target": "approvalComment",
      "type": "string",
      "sourceScope": "task",
      "targetScope": "process"
    }
  }
}
```

## End-To-End Business Scenario
### Loan Approval
1. `Start Event` maps request into process variables
2. service/script nodes calculate risk
3. `User Task` sends data to manager review form
4. process waits
5. manager completes form with:
   - `decision = true`
   - `comments = "Approved within policy"`
6. `outputMapping` writes those values back into:
   - `approved`
   - `approvalComment`
7. process continues to:
   - approved branch
   - rejected branch
   - end node

## Sync Vs Async Meaning
Any process containing a user task should usually be treated as asynchronous from the caller’s point of view.

Why:
- the process pauses for human work
- the caller should not wait on the same HTTP request for completion
- the start call should usually return an acknowledgement and `instanceId`
- the final business result should come later from runtime completion

Typical pattern:
- `Start Event.outboundMapping` -> immediate `ACCEPTED`
- `User Task` -> wait for human input
- `End Event.outputMapping` -> final business result

## Validation Notes
- `name` and `formKey` are required.
- Mapping rows must have both a source key and a target key.
- `assignee` and `candidateGroups` should reflect a real task ownership strategy.

## Practical Recommendations
- Keep task input explicit. Do not dump all process variables into the form.
- Keep task output explicit. Only map the decisions you really need.
- Use business-oriented field names in forms such as `decision`, `comments`, `reason`, `nextAction`.
- Prefer group-based inboxes for shared operational work.
- Treat the task node as a wait state and design the start/end response model accordingly.

## Runtime Meaning
The engine should create a task record, show it in personal or group worklists, wait for completion, then apply `outputMapping` before continuing.
