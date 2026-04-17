# Compensation (Undo Logic) Configuration

Compensation is used to "undo" or revert the effects of a previously completed activity. This is common in "Saga Patterns" where a series of steps must be rolled back if a later step fails.

## 1. Compensation Throw Event
Triggers the compensation logic for a specific node or the entire process.

### Schema
```json
{
  "id": "trigger_rollback",
  "type": "THROW_COMPENSATION",
  "config": {
    "activityRef": "charge_credit_card"
  }
}
```

## 2. Boundary Compensation Event
Attached to an activity. It defines the "Undo" logic (a script or task) that should execute if compensation is triggered.

### Schema
```json
{
  "id": "undo_charge",
  "type": "BOUNDARY_COMPENSATION",
  "attachedTo": "charge_credit_card",
  "config": {
    "logic": {
      "type": "REST",
      "url": "https://stripe.com/api/refund",
      "method": "POST"
    }
  }
}
```

## 3. Implementation in Generic Renderer
The Orchestrator maintains a **Compensation Stack**:
1.  As nodes complete, if they have an associated `BOUNDARY_COMPENSATION`, their "Undo" config is pushed to the stack.
2.  If a `THROW_COMPENSATION` occurs, the Orchestrator pops the stack and executes documentation in LIFO (Last-In, First-Out) order.

> [!IMPORTANT]
> Compensation only triggers for **Completed** activities. It will not run for activities that failed during execution.
