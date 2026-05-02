# Terminate Event

Immediate stop for the whole active process context.

## What This Node Does
Ends the process immediately and should stop all remaining active branches.

## Properties
- `name`: Friendly termination label.

## Example
```json
{
  "name": "Terminate Fraudulent Order"
}
```

## Validation Notes
- Use this only when all remaining work must stop, not just the current path.
