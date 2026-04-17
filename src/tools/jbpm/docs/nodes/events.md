# Event Nodes Configuration (Timer, Signal, Message)

Event nodes allow the workflow to interact with time and external triggers asynchronously.

## 1. Timer Event
Used for delays or scheduled execution.

### Schema
```json
{
  "id": "delay_retry",
  "type": "TIMER",
  "config": {
    "duration": "PT15M",
    "isInterrupting": true
  }
}
```
- **`duration`**: ISO-8601 duration (e.g., `PT5M` for 5 mins, `P1D` for 1 day).
- **`isInterrupting`**: If true, cancels the associated task if the timer fires first (Boundary behavior).

---

## 2. Signal Event
Used to wait for an external broadcast event.

### Schema
```json
{
  "id": "wait_for_payment",
  "type": "SIGNAL",
  "config": {
    "signalName": "PAYMENT_RECEIVED",
    "scope": "CASE"
  },
  "outputMapping": {
    "txId": "payload.transactionId"
  }
}
```
- **`signalName`**: The identifier of the event.
- **`scope`**: `CASE` (specific to this instance) or `GLOBAL`.

---

## 3. Message Event
Used for point-to-point communication between processes.

### Schema
```json
{
  "id": "order_message",
  "type": "MESSAGE",
  "config": {
    "msgId": "ORDER_DISPATCH_MSG",
    "correlationKey": "#{orderId}"
  }
}
```

> [!NOTE]
> All events are injected as **Intermediate Catch Events** into the generic Case instance by the Orchestrator. When the event is caught, the workflow resumes at the next defined node.
