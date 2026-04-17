# End Events Configuration

End events define how a process branch or the entire process instance finishes.

## 1. None End Event
The standard termination of a single path.
```json
{ "id": "finish", "type": "END" }
```

## 2. Terminate End Event
Immediately ends the **entire** process instance, including all active parallel branches.
```json
{ "id": "kill_process", "type": "END_TERMINATE" }
```

## 3. Error End Event
Ends the process or subprocess and "throws" an error code that can be caught by a Boundary Error or Event Subprocess.
```json
{
  "id": "throw_fail",
  "type": "END_ERROR",
  "config": {
    "errorCode": "INSUFFICIENT_FUNDS"
  }
}
```

## 4. Escalation End Event
Throws an escalation signal that is non-interrupting (allows the branch to finish while signaling a problem).
```json
{
  "id": "warn_delay",
  "type": "END_ESCALATION",
  "config": {
    "escalationCode": "DELIVER_DELAY"
  }
}
```

## 5. Signal End Event
Throws a global signal when the process path completes.
```json
{
  "id": "notify_all",
  "type": "END_SIGNAL",
  "config": { "signalName": "PROCESS_FINISHED" }
}
```

## 6. Message End Event
Sends a point-to-point message to another process or container.
```json
{
  "id": "send_final_report",
  "type": "END_MESSAGE",
  "config": { "msgId": "REPORT_READY", "target": "reporting_service" }
}
```

## 7. Compensation End Event
Triggers the compensation (rollback) logic for the current transactional scope.
```json
{
  "id": "revert_all",
  "type": "END_COMPENSATION",
  "config": { "activityRef": null }
}
```

> [!CAUTION]
> Use `END_TERMINATE` carefully in parallel workflows, as it will cut off all other branches regardless of their state.
