# Intermediate Catch and Throw Events

Intermediate events occur between the start and end of a process. They are split into **Catching** (waiting for a trigger) and **Throwing** (emitting a trigger).

## 1. Catch Events
These nodes pause the workflow until a specific external or internal trigger occurs.

### Schema
```json
{
  "id": "wait_for_condition",
  "type": "CATCH_EVENT",
  "config": {
    "trigger": "CONDITIONAL",
    "expression": "return userApproved == true;"
  }
}
```

| Trigger Type | Description | Required Config |
| :--- | :--- | :--- |
| `TIMER` | Pauses for a duration or until a date. | `duration` or `at` |
| `SIGNAL` | Waits for a broadcast signal. | `signalName` |
| `MESSAGE` | Waits for a specific point-to-point message. | `msgName` |
| `CONDITIONAL`| Waits for a variable change logic. | `expression` |

---

## 2. Throw Events
These nodes trigger an action or broadcast an event without ending the process path.

### Schema
```json
{
  "id": "broadcast_update",
  "type": "THROW_EVENT",
  "config": {
    "trigger": "SIGNAL",
    "signalName": "DATA_UPDATED",
    "data": "#{currentPayload}"
  }
}
```

| Trigger Type | Description | Required Config |
| :--- | :--- | :--- |
| `NONE` | Primarily used for logging or transition markers. | - |
| `SIGNAL` | Broadcasts to all active processes. | `signalName` |
| `MESSAGE` | Sends a message to a specific container. | `msgName` |
| `ESCALATION` | Notifies high-level handlers (non-interrupting). | `code` |

> [!NOTE]
> Catch events create a **Resource Wait State** in jBPM. The thread is released and and can only be resumed when the trigger is received by the engine.
