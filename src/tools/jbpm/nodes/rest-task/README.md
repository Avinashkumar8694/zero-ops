# REST Service Task (V1.0.0)

Orchestration Primitive for synchronous API integrations.

## Overview
The REST Service Task enables the BigBang engine to interact with external microservices, cloud functions, and third-party APIs. It supports dynamic variable interpolation in URLs and payloads, custom headers, and granular JSONPath-based response mapping.

## Technical Parameters

| Field | Description | Type |
|-------|-------------|------|
| `endpoint` | The target URL. Supports `${variables.key}` | String |
| `method` | HTTP Verb (GET, POST, PUT, DELETE) | Enum |
| `headers` | Custom HTTP headers (e.g. Authorization) | KeyValue |
| `body` | JSON payload for POST/PUT requests | Snippet |
| `responseMap` | Mapping of JSONPath to local variables | KeyValue |

## Data Movement
1. **Outbound**: The engine interpolates the `endpoint` and `body` with the current process scope.
2. **Execution**: A synchronous HTTP request is dispatched via the `action.ts` runtime.
3. **Inbound**: The response is parsed, and `responseMap` keys are evaluated as JSONPaths. The results are hydrated back into the process `variables`.

## Example: Fetching User Profile
```json
{
  "endpoint": "https://api.acme.com/users/${variables.userId}",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer ${secrets.API_KEY}"
  },
  "responseMap": {
    "$.profile.email": "userEmail",
    "$.status.active": "isUserActive"
  }
}
```
