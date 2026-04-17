# Advanced Gateway Configurations

Advanced gateways provide more complex routing logic than the standard Exclusive (XOR) or Parallel (AND) gateways.

## 1. Inclusive Gateway (OR)
An Inclusive Gateway triggers one or more outgoing paths based on which conditions evaluate to true. If multiple conditions are true, multiple paths are executed in parallel.

### Schema
```json
{
  "id": "multi_dispatch",
  "type": "INCLUSIVE_GATEWAY",
  "config": {
    "conditions": [
      { "if": "#{needsEmail}", "then": "send_email" },
      { "if": "#{needsSMS}", "then": "send_sms" },
      { "if": "#{needsPush}", "then": "send_push" }
    ],
    "default": "log_completion"
  }
}
```
- **Merging**: Unlike Exclusive gateways, the Inclusive Join waits for all active paths triggered by its corresponding diverging gateway to complete before continuing.

---

## 2. Event-Based Gateway
An Event-Based Gateway is used when the routing decision is based on an external event (signal, message, timer) rather than process data.

### Schema
```json
{
  "id": "wait_for_first_event",
  "type": "EVENT_GATEWAY",
  "config": {
    "events": [
      { "type": "SIGNAL", "name": "PAYMENT_RECEIVED", "then": "dispatch" },
      { "type": "TIMER", "duration": "P3D", "then": "cancel_order" }
    ]
  }
}
```
- **Logic**: The first event to occur "wins," the path is taken, and all other paths defined in the gateway are discarded.

> [!TIP]
> Use Event-Based Gateways for "Race Condition" logic, such as waiting for a user approval OR a timeout, whichever happens first.
