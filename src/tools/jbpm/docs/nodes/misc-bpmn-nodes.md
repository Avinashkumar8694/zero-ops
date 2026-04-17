# Miscellaneous BPMN Nodes

This document covers remaining specialized BPMN 2.0 nodes supported by the Zero-Flow Generic Renderer.

## 1. Complex Gateway
Used for advanced synchronization logic where `JOIN` or `FORK` conditions are not strictly Parallel or Inclusive.

### Schema
```json
{
  "id": "advanced_merge",
  "type": "COMPLEX_GATEWAY",
  "config": {
    "activationCondition": "#{count_of_ready_branches} >= 2",
    "outgoingCondition": "return data.isValid == true;"
  }
}
```

---

## 2. None Task (Abstract Task)
Acts as a placeholder or a documentation marker in the workflow. It executes no logic and completes immediately.

### Schema
```json
{
  "id": "step_marker",
  "type": "NONE_TASK",
  "config": {
    "label": "Wait for external physical process"
  }
}
```

---

## 3. Link Catch Event
The destination for a `THROW_LINK` event. It allows jumping between process points without sequence flows.

### Schema
```json
{
  "id": "exit_logic_catch",
  "type": "CATCH_LINK",
  "config": { "name": "exit_logic" }
}
```

---

## 4. Swimlanes (Roles and Pools)
Organizations can define roles and pools to group tasks logically.

### Schema
```json
{
  "roles": [
    { "id": "hr_manager", "users": ["alice", "bob"] },
    { "id": "finance_team", "groups": ["billing_dept"] }
  ]
}
```
- **Usage**: Reference these roles in the `User Task` node under `actors` or `groups`.

---

## 5. Data Stores
Used to define persistent storage references that can be read/written by tasks.

### Schema
```json
{
  "dataStores": [
    { "id": "user_db", "type": "SQL", "connection": "jdbc:zero/users" }
  ]
}
```

> [!TIP]
> Use `NONE_TASK` nodes during the design phase to outline your process before implementing the technical logic of each step.
