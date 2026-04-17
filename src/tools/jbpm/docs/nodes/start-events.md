# Start Events Configuration

Start events define the entry point of a process or subprocess. Different triggers allow processes to be started manually, scheduled, or reactively.

## 1. None Start Event
The default entry point. Triggered manually via the API or another process.
```json
{ "id": "start", "type": "START" }
```

## 2. Timer Start Event
Triggers the process automatically based on a schedule.
```json
{
  "id": "nightly_cleanup",
  "type": "START_TIMER",
  "config": {
    "cron": "0 0 * * *",
    "at": null
  }
}
```

## 3. Signal Start Event
Starts a new process instance whenever a specific global signal is broadcast.
```json
{
  "id": "on_new_customer",
  "type": "START_SIGNAL",
  "config": { "signalName": "CUSTOMER_CREATED" }
}
```

## 4. Message Start Event
Starts a process when a specific point-to-point message is received from an external system.
```json
{
  "id": "web_hook_entry",
  "type": "START_MESSAGE",
  "config": { "msgId": "STRIPE_EVENT_MSG" }
}
```

## 5. Conditional Start Event
Starts a process when a data condition in the jBPM environment becomes true.
```json
{
  "id": "low_stock_trigger",
  "type": "START_CONDITIONAL",
  "config": { "expression": "return inventoryCount < 10;" }
}
```

## 6. Error/Escalation Start Events
Used specifically within **Event Subprocesses** to start the internal flow when an error or escalation is caught in the parent scope.

> [!TIP]
> Use `START_TIMER` with cron expressions for automated maintenance tasks or periodic reporting workflows.
