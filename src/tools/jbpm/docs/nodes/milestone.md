# Milestone Node Configuration

Milestones are a special type of wait state in jBPM Case Management that are triggered when specific data conditions are met in the Case File.

## Configuration Schema

```json
{
  "id": "billing_reached",
  "type": "MILESTONE",
  "config": {
    "condition": "return totalAmount > 5000;",
    "name": "High Value Milestone"
  }
}
```

## Parameter Details

| Attribute | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `condition` | A boolean expression (Javascript/Java) that jBPM monitors. | Yes | - |
| `name` | The human-readable name of the milestone. | Yes | - |

## Execution Logic
1.  **Subscription**: The Orchestrator registers the milestone in the Case Instance.
2.  **Monitoring**: jBPM continuously evaluates the `condition` whenever a Case Variable is updated.
3.  **Completion**: Once the condition is true, the milestone is "reached" (Completed), and the Orchestrator executes the `next` node.

> [!TIP]
> Use Milestones to track high-level progress or "KPI Targets" in your business process that aren't strictly sequential.
