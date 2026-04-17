# Boundary Events Configuration

Boundary events are attached to tasks and allow the workflow to react to asynchronous triggers while that task is active.

## 1. Interrupting vs. Non-Interrupting
- **Interrupting**: Cancels the host task and moves to the handle path (e.g., a Timeout that stops a User Task).
- **Non-Interrupting**: Starts a parallel path while the host task remains active (e.g., a Reminder signal).

## 2. Event Types

### Timer Boundary
Triggers after a duration or at a specific time.
```json
{
  "id": "task_timeout",
  "type": "BOUNDARY_TIMER",
  "attachedTo": "user_task_01",
  "config": {
    "duration": "PT4H",
    "interrupting": true
  },
  "next": "escalate_task"
}
```

### Error Boundary
Triggers when a Service Task or Subprocess throws a specific error.
```json
{
  "id": "catch_api_error",
  "type": "BOUNDARY_ERROR",
  "attachedTo": "rest_task_01",
  "config": {
    "errorCode": "java.net.ConnectException",
    "interrupting": true
  },
  "next": "notify_admin"
}
```

### Escalation Boundary
Triggers when an business escalation code is signaled.
```json
{
  "id": "too_many_retries",
  "type": "BOUNDARY_ESCALATION",
  "attachedTo": "approval_loop",
  "config": {
    "escalationCode": "TIMEOUT_ESC",
    "interrupting": false
  },
  "next": "send_reminder_email"
}
```

### Signal/Message Boundary
Triggers on receiving an external signal or point-to-point message.

## 3. Implementation in Generic Renderer
Since nodes are ad-hoc, the Orchestrator implements boundary logic using the **Watchdog Process**:
- When `attachedTo` node is started, the Orchestrator spawns a parallel listener for the Boundary event.
- If `interrupting` is true, it sends a `TERMINATE` signal to the host node upon catch.
