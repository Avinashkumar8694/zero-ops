# Transition Logic (Sequence Flow) (V1.0.0)

Structural Primitive for directional orchestration and branching.

## Overview
Sequence Flows define the path between nodes. When emanating from a Decision Point (Gateway), they can carry boolean expressions that determine whether the engine transitions to the target node.

## Technical Parameters

| Field | Description | Type |
|-------|-------------|------|
| `conditionExpression` | Boolean Javascript expression (e.g. `variables.total > 100`). | Snippet |
| `isDefault` | If true, this path is chosen if no other conditions match. | Toggle |

## Data Movement
1. **Evaluation**: When a source node completes, the engine evaluates the conditions on all outgoing Sequence Flows.
2. **Selection**: If multiple paths match, the first match (by UI order) is taken, unless emanating from an Inclusive Gateway.
3. **Execution**: The engine transitions the thread to the target node associated with the winning Sequence Flow.

## Example: Conditional Branching
```javascript
variables.score >= 500 && variables.status === "ACTIVE"
```
