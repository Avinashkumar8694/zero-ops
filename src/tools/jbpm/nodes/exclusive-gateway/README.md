# Exclusive Junction (Gateway) (V1.0.0)

Structural Primitive for mutually exclusive branching logic.

## Overview
The Exclusive Gateway (XOR) serves as a decision point in the process. It evaluates outgoing Sequence Flows in a tactical sequence and selects the **first** path where the condition evaluates to true. If no conditions match, the Default path is taken.

## Technical Parameters
This node is primarily structural and uses the conditions defined on its outgoing **Sequence Flows** to determine movement.

| Field | Description | Type |
|-------|-------------|------|
| `name` | Decision Label (e.g. "Is Approved?"). | String |

## Data Movement
1. **Convergence**: Acts as a merge point for multiple incoming flows.
2. **Evaluation**: Triggers the evaluation of all outgoing Sequence Flow conditions.
3. **Branching**: Transactionally selects a single execution thread.

## Example: Workflow Split
- Path A: `variables.amount > 1000` -> "High Value Approval"
- Path B: `isDefault` -> "Standard Processing"
