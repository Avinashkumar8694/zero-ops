# Subprocess Patterns Configuration

Subprocesses allow for grouping, scoping, and repeated execution of task sets.

## 1. Multi-Instance Subprocess (Loops)
Used to iterate over a collection of items (e.g., processing every item in an order).

### Schema
```json
{
  "id": "item_processing_loop",
  "type": "MULTI_INSTANCE",
  "config": {
    "collection": "#{orderItems}",
    "itemVar": "currentItem",
    "isSequential": false,
    "completionCondition": "#{count} == #{total}"
  },
  "nodes": [ ... ] 
}
```
- **`isSequential`**: If `false`, all items are processed in parallel.
- **`collection`**: The list variable to iterate over.

---

## 2. Event-Based Subprocess
A special subprocess that is triggered by an event (error, signal, timer) while the main process is running. It is not part of the standard sequential flow.

### Schema
```json
{
  "id": "global_cancellation_handler",
  "type": "EVENT_SUBPROCESS",
  "config": {
    "trigger": { "type": "SIGNAL", "name": "CANCEL_ALL" },
    "isInterrupting": true
  },
  "nodes": [ ... ]
}
```

---

## 3. Embedded Subprocess
Used for local scoping of variables and boundary events (e.g., a "Try-Catch" block).

### Schema
```json
{
  "id": "transaction_block",
  "type": "SUBPROCESS",
  "nodes": [ ... ]
}
```

> [!NOTE]
> Multi-instance logic in the Generic Renderer is implemented by the Orchestrator spawning multiple Case Task groups in parallel or sequence, managing the aggregation of results.
