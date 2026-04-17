# Parallel Flow Configuration

The `Parallel` node allows the simultaneous execution of multiple branches within the workflow.

## Configuration Schema

```json
{
  "id": "batch_processing",
  "type": "PARALLEL",
  "config": {
    "branches": [
      { "id": "process_inventory", "entry": "inventory_lookup" },
      { "id": "process_shipping", "entry": "calculate_shipping" }
    ],
    "join": {
      "type": "ALL",
      "waitFor": ["process_inventory", "process_shipping"]
    }
  }
}
```

## Parameter Details

| Attribute | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `branches` | List of entry points for the parallel paths. | Yes | - |
| `join.type` | The merge logic: `ALL` (wait for all branches) or `ANY` (first one finishes ends the block). | Yes | `ALL` |
| `join.waitFor`| Explicit list of branch IDs to wait for. | No | `ALL branches` |

## Execution Logic
1.  **Fork**: The Generic Interpreter sends multiple concurrent POST requests to the jBPM Case API.
2.  **Execution**: Each branch runs as an independent ad-hoc task or sub-flow within the same Case Instance.
3.  **Join**: The Orchestrator tracks the completion of each branch. Once the `join` condition is met, it triggers the `next` node in the sequence.

> [!IMPORTANT]
> Since jBPM Case variables are shared, ensure that parallel branches do not attempt to write to the same variable simultaneously to avoid race conditions.
