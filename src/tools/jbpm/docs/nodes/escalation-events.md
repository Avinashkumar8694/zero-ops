# Escalation Events Configuration

Escalation events are used for "Business Exceptions" that require alternate handling without necessarily stopping the primary flow.

## 1. Throwing Escalation
Triggers an escalation signal while allowing the current path to continue.

### Schema
```json
{
  "id": "warn_manager",
  "type": "THROW_ESCALATION",
  "config": {
    "escalationCode": "PROCESS_DELAYED_WARNING",
    "data": { "reason": "System Slowness" }
  }
}
```

## 2. Catching Escalation (Boundary/Subprocess)
Reacts to an escalation thrown within its scope.

### Schema
```json
{
  "id": "catch_delay",
  "type": "BOUNDARY_ESCALATION",
  "attachedTo": "main_process_block",
  "config": {
    "escalationCode": "PROCESS_DELAYED_WARNING",
    "interrupting": false
  },
  "next": "log_warning_step"
}
```

## 3. Propagation Logic
- **Non-Interrupting**: Standard escalation behavior. A new token is created for the escalation path, but the "Main Task" continues.
- **Scope**: Escalations propagate upwards to parent Subprocesses or Call Activities until a matching catch node is found.

> [!TIP]
> Use Escalations for "SLA Warnings" or "Non-Critical Failures" where you want to notify a system or user without killing the active task.
