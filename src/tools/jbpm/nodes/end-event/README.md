# End Event

Normal completion point for a process.

## What This Node Does
Marks successful process completion and optionally prepares a final output payload.

In this engine, `outputMapping` is the exit contract. It determines which process values are returned to:
- the API caller
- a parent process
- an SSD or low-code consumer
- any service waiting for the final result

## Properties
- `name`: Final status label.
- `outputMapping`: Maps process values into the final response or result object.

## How Output Is Defined
For API-triggered processes, the end node should normally define the final response contract.

Think of the process like this:
1. `Start Event` receives input and creates process variables
2. workflow updates those variables through service tasks, scripts, user tasks, and subprocesses
3. `End Event.outputMapping` chooses which final values are exposed outside the process

This matters because process variables are internal state. The final API response should be explicit and stable.

Recommended rule:
- internal process data lives in variables
- external response data lives in `outputMapping`

## Mapping Behavior
Each mapping row can use one of these source styles:
- Process variable: `approved -> approved`
- Variable expression: `${variables.orderId} -> orderId`
- Static literal: `"COMPLETED" -> status`, `true -> success`, `0 -> retryCount`
- Structured path or expression when supported by the consumer

Target values are usually response keys such as `orderId`, `status`, `message`, or `data`.

## Example: Final API Response
```json
{
  "name": "Process Complete",
  "outputMapping": {
    "approved": { "target": "approved", "type": "boolean", "sourceScope": "process", "targetScope": "output" },
    "${variables.orderId}": { "target": "orderId", "type": "string", "sourceScope": "process", "targetScope": "output" },
    "\"COMPLETED\"": { "target": "status", "type": "string", "sourceScope": "process", "targetScope": "output" }
  }
}
```

Resulting API response:
```json
{
  "approved": true,
  "orderId": "ORD-9001",
  "status": "COMPLETED"
}
```

## Common Scenarios
### 1. Final Synchronous Response
Use this when the process starts by API and completes in the same request.

Example response keys:
- `status`
- `message`
- `data`
- business IDs such as `orderId`, `invoiceId`, `caseId`

### 2. Human Task Process
Use this when the process starts by API but finishes later after user action.

Typical pattern:
- `Start Event.outboundMapping` returns `ACCEPTED` and `instanceId`
- human task APIs are used to complete work
- `End Event.outputMapping` defines the final result once the instance actually completes

### 3. Parent / Child Process Contract
Use this when the current process is called by a `Call Activity`.

In that case:
- child process `End Event.outputMapping` becomes the child output contract
- parent `Call Activity.outputMapping` maps child outputs back into parent variables

### 4. Static Exit Flags
Use static literals when the exit contract needs fixed values.

Examples:
- `"COMPLETED" -> status`
- `true -> success`
- `"No approval required" -> message`

## How To Use It Well
- Return only the fields external callers or parent processes really need.
- Prefer stable response keys such as `status`, `message`, `data`, `result`, or business IDs.
- Use static literals for terminal status flags instead of forcing earlier nodes to create one more variable.
- Keep response mapping explicit so API contracts stay stable over time.
- If the process is meant to be consumed as an API, treat this node as the response body designer.
- Keep transport concerns such as status code or headers separate from body mapping when those fields are added later.

## Validation Notes
- `name` and `outputMapping` are required in the current node definition.
- Keep only the fields consumers really need in the final output.

## Triggering And Reading Output
If the process is triggered through the custom engine API, the main flow is:

1. trigger the process through the Start API
2. process variables are initialized from request mappings
3. workflow executes
4. end node returns the final mapped output

Example API shape:
```bash
curl -X POST http://localhost:3000/api/engine/processes/order-intake/start \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "orderId": "ORD-9001",
      "amount": 4500
    }
  }'
```

If the process completes synchronously, the caller should receive the end node output contract as the final business response.

## Swagger / API Docs
Use the built-in API documentation to inspect the custom BPM engine contract:

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs/openapi.json`

The Swagger contract documents:
- process start requests
- instance inspection
- human task claim, complete, and reassign
- signal APIs
- deployment and asset contract APIs

## Runtime Meaning
When this node completes, the engine should treat the mapped result as the final output payload for the process branch or instance.
