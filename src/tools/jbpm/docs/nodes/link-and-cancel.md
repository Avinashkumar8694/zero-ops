# Link and Cancel Event Configurations

Specialized events for jumping through workflows and managing transactional rollbacks.

## 1. Link Events (Go-To Logic)
Link events allow you to connect two distant parts of a process without drawing a sequence flow line.

### Link Throw
```json
{
  "id": "jump_to_exit",
  "type": "THROW_LINK",
  "config": { "target": "exit_logic_catch" }
}
```

### Link Catch
```json
{
  "id": "exit_logic_catch",
  "type": "CATCH_LINK",
  "config": { "name": "exit_logic" }
}
```

---

## 2. Cancel Events (Transaction Rollback)
Used specifically inside and on the boundary of **Transactional Subprocesses**.

### Cancel End Event
Triggered inside a transaction to start the rollback process.
```json
{
  "id": "trigger_cancel",
  "type": "END_CANCEL"
}
```

### Cancel Boundary Event (Catch)
Attached to the transaction subprocess boundary. It catches the `END_CANCEL` signal, interrupts all internal tasks, and triggers compensation handlers.
```json
{
  "id": "handle_rollback",
  "type": "BOUNDARY_CANCEL",
  "attachedTo": "financial_transaction",
  "next": "log_failure_step"
}
```

> [!IMPORTANT]
> A `BOUNDARY_CANCEL` is always interrupting and must be paired with an `END_CANCEL` or a technical failure within a Transaction node.
