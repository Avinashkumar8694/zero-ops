# Call Activity Node Configuration

The `Call Activity` node is used to invoke and wait for another independent process definition (external workflow).

## Configuration Schema

```json
{
  "id": "trigger_shipping",
  "type": "CALL_ACTIVITY",
  "config": {
    "workflowId": "shipping_v2",
    "waitForCompletion": true,
    "inputs": {
      "addr": "#{customerAddress}",
      "pkg": "#{packageDetails}"
    }
  },
  "outputMapping": {
    "trackId": "trackingNumber"
  }
}
```

## Parameter Details

| Attribute | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `workflowId` | The ID of the workflow (JSON filename or Process ID) to invoke. | Yes | - |
| `waitForCompletion`| If true, the parent workflow stalls until the child finishes. | No | `true` |
| `inputs` | Variable mapping from parent to child. | No | `{}` |
| `outputMapping`| Variable mapping from child back to parent. | No | `{}` |

## Sub-Workflow Resolution
In the Zero-Flow Generic Renderer, the `workflowId` can point to:
1.  **Another JSON file**: The Orchestrator starts a new Generic Case for that file.
2.  **A standard BPMN Process**: The Orchestrator calls the native jBPM startProcess API.

> [!TIP]
> Use Call Activities to modularize complex logic and enable "Workflow as a Service" (WaaS) within your organization.
