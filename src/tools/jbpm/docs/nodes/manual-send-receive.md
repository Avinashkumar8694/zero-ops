# Manual and Send/Receive Task Configurations

These nodes represent actions that either happen outside the system or involve message-based communication.

## 1. Manual Task
A manual task is an activity performed without the aid of any business process execution engine or any application. No system interaction occurs.

### Schema
```json
{
  "id": "physical_inspection",
  "type": "MANUAL_TASK",
  "config": {
    "name": "Inspect Hardware",
    "description": "Technician must visually inspect the server rack."
  }
}
```
- **Behavior**: The engine simply logs that this step was reached and immediately moves to the next node. It serves as documentation in the audit trail.

---

## 2. Send Task
Used to send a message to an external system. Similar to a Service Task but specifically used for asynchronous messaging.

### Schema
```json
{
  "id": "notify_shipping",
  "type": "SEND_TASK",
  "config": {
    "messageName": "DISPATCH_ORDER",
    "payload": {
      "id": "#{orderId}",
      "priority": "HIGH"
    }
  }
}
```

---

## 3. Receive Task
Used to wait for a specific message to arrive before continuing.

### Schema
```json
{
  "id": "wait_for_delivery_conf",
  "type": "RECEIVE_TASK",
  "config": {
    "messageName": "DELIVERY_COMPLETE",
    "correlationKey": "#{trackingNumber}"
  },
  "outputMapping": {
    "deliveryDate": "timestamp"
  }
}
```

> [!NOTE]
> Receive Tasks create a **Wait State** in the jBPM persistence layer. The workflow will remain "Active" at this node until a matching message is signaled to the process instance.
