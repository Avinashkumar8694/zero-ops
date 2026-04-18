# User Task (Human-in-the-Loop) (V1.0.0)

Orchestration Primitive for Human-Centric state management.

## Overview
The User Task suspends the execution of a process instance until a specific Human Actor or Group provides an asynchronous signal (Completion). This node integrates directly with the Unified Worklist and supports dynamic form rendering.

## Technical Parameters

| Field | Description | Type |
|-------|-------------|------|
| `assignee` | The Actor ID or Group (e.g. `manager_1`). Supports variables. | String |
| `formKey` | The Zero-Form ID to render for the actor. | String |
| `priority` | Task urgency (LOW, NORMAL, HIGH, CRITICAL). | Enum |
| `dueDate` | SLA duration (ISO-8601) or specific date. | String |

## Data Movement
1. **Suspension**: The engine evaluates the `assignee` and `formKey`, then transitions the process state to `WAITING`.
2. **Worklist Notification**: The task is persisted to the `zero_tasks` repository and made available in the actor's dashboard.
3. **Completion**: When the actor submits the form, the payload is mapped to process variables and the engine triggers a résumé.

## Example: Document Approval
```json
{
  "assignee": "finance_team",
  "formKey": "approval-form-v2",
  "priority": "HIGH",
  "dueDate": "PT4H"
}
```
