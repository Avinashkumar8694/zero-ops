# Sequence Flow

Directed path between BPMN nodes.

## What This Node Does
Connects one node to the next and optionally adds a condition or default route flag.

## Properties
- `name`: Friendly route label.
- `conditionExpression`: JavaScript boolean expression evaluated against process variables.
- `isDefault`: Whether this path is taken when no other conditional path matches.

## Example
```json
{
  "name": "High Value Order",
  "conditionExpression": "variables.amount > 5000",
  "isDefault": false
}
```

## Validation Notes
- Conditions should return `true` or `false`.
- Only one route should normally be marked as default after a decision point.
