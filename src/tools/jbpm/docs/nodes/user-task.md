# User Task Node Configuration

The `User Task` node represents a manual action that must be performed by a human actor.

## Configuration Schema

```json
{
  "id": "manager_approval",
  "type": "USER_TASK",
  "config": {
    "name": "Approve Purchase Request",
    "description": "Review the items and approve or reject the total amount: #{orderAmount}",
    "actors": ["#{managerId}"],
    "groups": ["approvers"],
    "priority": 1,
    "formId": "approval-v1",
    "inputs": {
      "orderData": "#{order}",
      "requestor": "#{user}"
    }
  },
  "outputMapping": {
    "approved": "decision",
    "reason": "comments"
  }
}
```

## Parameter Details

| Attribute | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `name` | The name of the task as it appears in the task list. | Yes | - |
| `actors` | List of specific User IDs assigned to the task. | No | `[]` |
| `groups` | List of User Groups assigned to the task. | No | `[]` |
| `formId` | Reference to the UI template/form used to render the task. | Yes | - |
| `inputs` | Data variables mapped *to* the task scope. | No | `{}` |
| `outputMapping` | Mapping of task variables back *to* the Case File. | No | `{}` |

## Task Lifecycle
1.  **Creation**: The Generic Interpreter creates an ad-hoc task in the jBPM Case.
2.  **Assignment**: The engine assigns it to the specified actors/groups.
3.  **Completion**: When a user submits the form, the `outputMapping` extracts the result and the workflow continues.

> [!NOTE]
> Actors and Groups support template interpolation, allowing dynamic assignment based on previous process steps.
