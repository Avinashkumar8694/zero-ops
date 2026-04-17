# Script Node Configuration

The `Script` node allows for the execution of custom logic or data transformation directly within the jBPM engine.

## Configuration Schema

```json
{
  "id": "transform_payload",
  "type": "SCRIPT",
  "config": {
    "language": "javascript",
    "script": "var total = parseFloat(price) * quantity; kcontext.setVariable('totalPrice', total);"
  }
}
```

## Parameter Details

| Attribute | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `language` | The script engine to use (`javascript` or `java`). | Yes | `javascript` |
| `script` | The raw code to execute. | Yes | - |

## Execution Context
The script has access to:
- **`kcontext`**: The jBPM Process Context (allows getting/setting variables).
- **`caseFile`**: Direct access to the shared Case storage.
- **`logger`**: The system logger for debugging.

> [!CAUTION]
> Use Script nodes sparingly for complex logic. For high-complexity transformations or external integrations, prefer the **REST Node** or a dedicated **Java WorkItemHandler**.
