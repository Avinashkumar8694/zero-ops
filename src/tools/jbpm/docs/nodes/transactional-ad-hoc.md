# Transactional and Ad-Hoc Process Patterns

Advanced execution patterns for reliable and flexible complex workflows.

## 1. Transactional Subprocess (ACID)
Used when a group of nodes must succeed as a single unit or fail atomically.

### Schema
```json
{
  "id": "financial_transaction",
  "type": "TRANSACTION",
  "nodes": [ ... ],
  "config": {
    "cancelMapping": "rollback_logic",
    "compensation": true
  }
}
```
- **Logic**: If any node inside reaches a `CANCEL_END` or throws an error, the engine automatically triggers compensation for all successfully completed nodes inside the transaction.

---

## 2. Ad-Hoc Process Fragments
Independent nodes defined in a process that do not have incoming sequence flows. They can be triggered manually or via signal multiple times.

### Schema
```json
{
  "id": "on_demand_logging",
  "type": "AD_HOC_FRAGMENT",
  "config": {
    "trigger": "SIGNAL",
    "name": "CAPTURE_DEBUG_INFO"
  },
  "logic": { ... }
}
```

---

## 3. Link Events (Go-To Logic)
Used for jumping between distant points in a process without crossing sequence flows.

### Schema
```json
{
  "id": "jump_to_exit",
  "type": "THROW_LINK",
  "config": { "target": "exit_logic_catch" }
}
```

---

## 4. Multi-Instance Tasks
Standard nodes (REST, User Task) configured to execute multiple times.

### Schema
```json
"config": {
  "loop": {
    "collection": "#{approverList}",
    "item": "currentApprover",
    "isSequential": true
  }
}
```

> [!NOTE]
> Transactional subprocesses are mapped to the jBPM `TransactionSubProcess` node, which manages internal state snapshots for rollback.
