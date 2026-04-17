# Exclusive Gateway Node Configuration

The `Exclusive Gateway` (XOR) node is used to control the branching logic of the workflow based on data conditions.

## Configuration Schema

```json
{
  "id": "check_status",
  "type": "GATEWAY",
  "config": {
    "conditions": [
      {
        "if": "#{status} == 'PAID'",
        "then": "dispatch_order"
      },
      {
        "if": "#{status} == 'PENDING' && #{retryCount} < 3",
        "then": "wait_for_payment"
      }
    ],
    "default": "cancel_order"
  }
}
```

## Parameter Details

| Attribute | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `conditions` | An ordered list of condition-target pairs. First match wins. | Yes | - |
| `conditions[].if`| A boolean expression evaluated against the Case File variables. | Yes | - |
| `conditions[].then`| The `id` of the next node to execute if the condition is true. | Yes | - |
| `default` | The fallback node `id` if no conditions match. | Yes | - |

## Expression Syntax
Expressions support standard Java dynamic evaluation or Javascript evaluation depending on the configured **Generic Script Handler**.
- Example logic: `#{totalAmount} > 1000`
- Complex logic: `#{user.type} == 'PREMIUM' && #{items.size()} > 0`

> [!WARNING]
> If no conditions match and no `default` node is provided, the workflow will stall. Always define a `default` path for production workflows.
