# REST Node Configuration

The `REST` node is the primary mechanism for interacting with external services and APIs in the Zero-Flow Generic Renderer.

## Configuration Schema

```json
{
  "id": "fetch_user_profile",
  "type": "REST",
  "config": {
    "url": "https://api.example.com/users/#{userId}",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer #{secrets.API_TOKEN}",
      "Content-Type": "application/json"
    },
    "body": null,
    "timeout": {
      "connect": 5000,
      "read": 10000
    },
    "retry": {
      "count": 3,
      "backoff": "exponential",
      "delay": 1000
    }
  },
  "outputMapping": {
    "email": "$.profile.email",
    "status": "$.status"
  }
}
```

## Parameter Details

| Attribute | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `url` | Target endpoint. Supports template interpolation `#{var}`. | Yes | - |
| `method` | HTTP method (GET, POST, PUT, DELETE, PATCH). | Yes | GET |
| `headers` | Key-Value pairs for HTTP headers. | No | `{}` |
| `body` | Request payload. Can be a JSON object or string. | No | `null` |
| `timeout` | Connection and Read timeouts in milliseconds. | No | Engine Defaults |
| `retry` | Policy for handling transient network failures. | No | `null` |

## Output Mapping
The `outputMapping` uses **JSONPath** syntax to extract values from the response body and store them back into the **Case File** variable scope.

> [!TIP]
> Use `#{secrets.NAME}` to securely inject credentials from the tool's vault without exposing them in the workflow JSON.
