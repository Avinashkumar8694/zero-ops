# Start Event

Primary entry point for a process instance.

## What This Node Does
Use this node to define how a process starts, which variables exist at startup, how inbound API data is converted into process state, and whether the trigger returns an immediate acknowledgement payload.

In this engine, the start event is the API entry contract for:
- request shape
- process variable creation
- request-to-variable mapping
- optional immediate response mapping

In simple terms:
- input enters here
- process variables are created here
- request data is copied into those variables here
- optional immediate response is built here

If the process is API-first, this node is the public request contract of the workflow.

## When To Use It
- Manual API or UI starts
- Webhook-triggered flows
- Scheduled jobs
- Message or signal driven processes

## Properties
- `name`: Friendly runtime label for the instance.
- `triggerType`: `MANUAL`, `WEBHOOK`, `CRON`, `MESSAGE`, or `SIGNAL`.
- `variableDefinitions`: Shared process variables. Each row should define a variable name, type, and default value.
- `localVariables`: Optional temporary startup variables used before values are promoted into process scope.
- `inboundMapping`: Maps inbound request fields into process variables.
- `outboundMapping`: Maps process values into the immediate API response payload returned from the start trigger.
- `cronExpression`: Required when `triggerType` is `CRON`.
- `triggerPath`: Used for webhook style starts.
- `messageTopic`: Used for message or signal driven starts.
- `payloadSchema`: Optional JSON contract-like shape for the inbound request body. This drives low-code suggestions such as `$.data.customerId`.

## Think About It In 3 Layers
### 1. Input Layer
This is what arrives from the outside world:
- HTTP body
- headers
- query params
- route params
- runtime metadata

### 2. Process Variable Layer
This is your internal process state.

Examples:
- `customerId`
- `amount`
- `approvalStatus`
- `requestId`
- `tenantId`

These variables are what later tasks, gateways, scripts, subprocesses, and end nodes should use.

### 3. Immediate Response Layer
This is only for the response that should be sent immediately from the start trigger.

Examples:
- `status: ACCEPTED`
- `requestId: ORD-1001`
- `message: Request received`

If you need the final business response after the whole flow finishes, that belongs in the end node, not here.

## How To Trigger This Process Through API
For API-first use, the Start Event should be treated as the public input contract of the process.

Recommended request context shape:
```json
{
  "data": {
    "customerId": "C100",
    "amount": 5000
  },
  "headers": {
    "authorization": "Bearer <token>"
  },
  "query": {
    "preview": "false"
  },
  "params": {
    "tenantId": "north"
  },
  "meta": {
    "triggeredBy": "ssd-app"
  }
}
```

In mappings:
- `$` means the full inbound request context object
- `$.data` means request body
- `$.headers` means headers
- `$.query` means query string values
- `$.params` means route or path params
- `$.meta` means custom transport/runtime metadata

### What `$` Means
`$` is the root of the normalized inbound trigger object.

So:
- `$.data.customerId` means request body field `customerId`
- `$.headers.authorization` means HTTP header `authorization`
- `$.query.preview` means query parameter `preview`
- `$.params.tenantId` means route parameter `tenantId`

Use plain `$` only when you really want the whole input object.

Most real mappings should use:
- `$.data.*`
- `$.headers.*`
- `$.query.*`
- `$.params.*`

Example trigger call:
```bash
curl -X POST http://localhost:3000/api/engine/deployments/sales::1.0.0/processes/order-intake/start \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "customerId": "C100",
      "amount": 5000,
      "email": "a@x.com"
    },
    "headers": {
      "authorization": "Bearer demo"
    },
    "query": {},
    "params": {
      "tenantId": "north"
    }
  }'
```

## How Variables Are Created And Used
This is the normal lifecycle:

1. `variableDefinitions` declares the process variables
2. `inboundMapping` copies incoming request values into those variables
3. downstream nodes use those process variables
4. optional `outboundMapping` returns an immediate response
5. final `End Event.outputMapping` can later return the final business result

Example variable definitions:
```json
{
  "customerId": { "type": "string", "defaultValue": "" },
  "amount": { "type": "number", "defaultValue": 0 },
  "tenantId": { "type": "string", "defaultValue": "" },
  "requestId": { "type": "string", "defaultValue": "" },
  "approvalStatus": { "type": "string", "defaultValue": "PENDING" }
}
```

After that, later nodes should read and update variables such as:
- `customerId`
- `amount`
- `approvalStatus`
- `requestId`

This is why start-node mapping is important: it converts transport-level input into process-level state.

## Input Mapping Example: Request -> Process Variables
Incoming request:
```json
{
  "data": {
    "customerId": "C100",
    "amount": 5000,
    "email": "a@x.com"
  },
  "headers": {
    "authorization": "Bearer demo-token"
  },
  "query": {
    "preview": "false"
  },
  "params": {
    "tenantId": "north"
  }
}
```

Example `inboundMapping`:
```json
{
  "$.data.customerId": {
    "target": "customerId",
    "type": "string",
    "sourceScope": "input",
    "targetScope": "process"
  },
  "$.data.amount": {
    "target": "amount",
    "type": "number",
    "sourceScope": "input",
    "targetScope": "process"
  },
  "$.params.tenantId": {
    "target": "tenantId",
    "type": "string",
    "sourceScope": "input",
    "targetScope": "process"
  },
  "\"REQ-1001\"": {
    "target": "requestId",
    "type": "string",
    "sourceScope": "input",
    "targetScope": "process"
  }
}
```

Process variable result after mapping:
```json
{
  "customerId": "C100",
  "amount": 5000,
  "tenantId": "north",
  "requestId": "REQ-1001",
  "approvalStatus": "PENDING"
}
```

## Process Variable To Output Variable Example
This is the part many users look for.

`outboundMapping` maps process variables into an immediate response payload.

Example process state after start initialization:
```json
{
  "customerId": "C100",
  "amount": 5000,
  "requestId": "REQ-1001",
  "approvalStatus": "PENDING"
}
```

Example `outboundMapping`:
```json
{
  "${variables.requestId}": {
    "target": "requestId",
    "type": "string",
    "sourceScope": "process",
    "targetScope": "output"
  },
  "${variables.customerId}": {
    "target": "customerId",
    "type": "string",
    "sourceScope": "process",
    "targetScope": "output"
  },
  "\"ACCEPTED\"": {
    "target": "status",
    "type": "string",
    "sourceScope": "process",
    "targetScope": "output"
  },
  "\"Request received successfully\"": {
    "target": "message",
    "type": "string",
    "sourceScope": "process",
    "targetScope": "output"
  }
}
```

Immediate response returned to caller:
```json
{
  "requestId": "REQ-1001",
  "customerId": "C100",
  "status": "ACCEPTED",
  "message": "Request received successfully"
}
```

This is what “process variable -> output variable” means:
- left side reads from internal process state
- right side decides the external response key

So:
- `${variables.customerId}` -> `customerId`
- `${variables.requestId}` -> `requestId`
- `"ACCEPTED"` -> `status`

## When To Use Start Output vs End Output
Use `Start Event.outboundMapping` when you want an immediate response from the start trigger.

Examples:
- async workflow acknowledgement
- webhook handshake
- request accepted confirmation
- long-running process that continues after the API call returns

Use `End Event.outputMapping` when you want the final business result after the whole process completes.

Examples:
- approved/rejected result
- final quote
- created case details
- final parent-process return contract

Simple rule:
- `Start inboundMapping` = request -> process variables
- `Start outboundMapping` = process variables -> immediate response
- `End outputMapping` = process variables -> final business result

## Input vs Output At Start
The start node can handle both input and output, but they serve different purposes:

- `inboundMapping`: request -> process variables
- `outboundMapping`: process variables -> immediate start response

Use `outboundMapping` when the caller needs an acknowledgement immediately, for example:
- async process accepted
- webhook handshake
- request receipt confirmation

Do not use `outboundMapping` as the main business result if the workflow continues. The final business/API result should come from the `End Event.outputMapping`.

## Mapping Behavior
`inboundMapping` and `outboundMapping` are low-code mapping surfaces. A mapping source may be:
- Payload path: `$.data.order.id`
- Header path: `$.headers.authorization`
- Query path: `$.query.preview`
- Route path: `$.params.tenantId`
- Process variable: `orderId`
- Variable expression: `${variables.orderId}`
- Static literal: `"RECEIVED"`, `true`, `0`

Typical targets:
- `inboundMapping`: process variables such as `orderId`, `amount`, `customerEmail`
- `outboundMapping`: response keys such as `status`, `message`, `data`, `requestId`

Examples:
- `$.data.orderId` -> `orderId`
- `$.headers.authorization` -> `authToken`
- `$.params.tenantId` -> `tenantId`
- `${variables.orderId}` -> `requestId`
- `"ACCEPTED"` -> `status`
- `true` -> `received`

## API Scenarios
### 1. Synchronous API Response
Use when the process runs to completion inside one request.

- `Start Event` receives and maps request data
- workflow runs
- `End Event.outputMapping` defines the HTTP response body

### 2. Immediate Ack Then Background Work
Use when the process is long-running, creates human tasks, or waits for signals.

- `Start Event.inboundMapping` initializes process variables
- `Start Event.outboundMapping` returns an acknowledgement such as `ACCEPTED`
- caller tracks the running instance using instance and task APIs

### 3. Human Task Flow
Use when the process creates work for users or groups.

- API trigger starts the process
- process creates one or more human tasks
- task clients use human task APIs to claim, inspect, and complete tasks
- final business output is produced later by the end node

### 4. Signal or Message Resume
Use when the process waits for an external event.

- API trigger starts the process
- runtime waits at a receive, message, or signal boundary
- external system later resumes the instance through a signal API

## Trigger Type By Trigger Type
This section explains how each `triggerType` should be used from an API and what kind of response to expect.

Before looking at the trigger types, understand one core rule:

- a process may start synchronously
- a process may continue asynchronously
- a process may pause at a wait state
- the final business result is still defined by the end node

What changes is not the meaning of the end node. What changes is:
- whether the caller waits for the process to finish now
- or whether the caller gets an acknowledgement and checks later

### 1. `MANUAL`
Use this when an SSD app, admin UI, or internal service explicitly starts the process.

Typical API:
```bash
curl -X POST http://localhost:3000/api/engine/deployments/sales::1.0.0/processes/order-intake/start \
  -H 'Content-Type: application/json' \
  -d '{
    "data": {
      "customerId": "C100",
      "amount": 5000
    }
  }'
```

Expected behavior:
- request body is normalized into the start context
- `inboundMapping` fills process variables
- if `outboundMapping` is defined, caller gets an immediate response
- if the process is synchronous, final result should come from the end node
- if the process becomes long-running, caller should use instance and task APIs afterward

Typical immediate response:
```json
{
  "success": true,
  "instanceId": "pi_1001",
  "status": "ACCEPTED"
}
```

How to get the final result:
- if synchronous: final HTTP response comes from `End Event.outputMapping`
- if asynchronous: inspect instance and output later through instance APIs

Business scenarios:
- Start a process from an admin console
- Start a case from an SSD application
- Start a workflow from a custom UI button
- Start a process from another internal microservice

Common mapping style:
- `$.data.customerId` -> `customerId`
- `$.data.amount` -> `amount`
- `$.headers.authorization` -> `authToken`
- `${variables.requestId}` -> `requestId`
- `"ACCEPTED"` -> `status`

### 2. `WEBHOOK`
Use this when an external system calls your process over HTTP.

Typical API:
```bash
curl -X POST http://localhost:3000/api/engine/deployments/integration::1.0.0/processes/customer-webhook/start \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer demo-token' \
  -d '{
    "data": {
      "eventType": "customer.created",
      "customerId": "C100"
    },
    "headers": {
      "authorization": "Bearer demo-token"
    }
  }'
```

Use this when you want mappings like:
- `$.data.eventType` -> `eventType`
- `$.data.customerId` -> `customerId`
- `$.headers.authorization` -> `authHeader`

Response behavior:
- if this is a handshake or acknowledgement flow, return immediate values from `outboundMapping`
- if this is a full business flow, return the final result from the end node

Example immediate webhook acknowledgement:
```json
{
  "status": "RECEIVED",
  "requestId": "REQ-1001"
}
```

Business scenarios:
- ERP sends order-created webhook
- CRM sends lead-created webhook
- partner platform sends callback event
- external form submits a case request

Typical mapping:
- `$.data.eventType` -> `eventType`
- `$.data.orderId` -> `orderId`
- `$.headers.x-request-id` -> `externalRequestId`
- `"RECEIVED"` -> `status`

### 3. `CRON`
Use this when the engine should start the process on a schedule.

Typical configuration:
```json
{
  "triggerType": "CRON",
  "cronExpression": "0 0 * * *"
}
```

How API works:
- usually there is no external caller at trigger time
- the engine itself creates the process instance on schedule
- `inboundMapping` usually uses static values, defaults, or generated metadata

Example scheduled-start mapping:
```json
{
  "\"nightly-batch\"": {
    "target": "jobName",
    "type": "string",
    "sourceScope": "input",
    "targetScope": "process"
  },
  "\"SYSTEM\"": {
    "target": "triggeredBy",
    "type": "string",
    "sourceScope": "input",
    "targetScope": "process"
  }
}
```

Response behavior:
- there is usually no direct HTTP response because the scheduler triggered it
- final result should be inspected through process instance APIs, logs, and variables

Business scenarios:
- nightly reconciliation
- daily invoice generation
- periodic compliance check
- hourly data sync

Typical mapping:
- static literals into process variables
- generated runtime metadata into process variables
- usually no caller-facing start response

### 4. `MESSAGE`
Use this when another system or internal bus publishes a named event/topic that should start the process.

Typical configuration:
```json
{
  "triggerType": "MESSAGE",
  "messageTopic": "orders.created"
}
```

Typical start payload:
```json
{
  "data": {
    "orderId": "ORD-1001",
    "customerId": "C100"
  },
  "meta": {
    "topic": "orders.created"
  }
}
```

Response behavior:
- usually message-triggered flows behave like asynchronous starts
- immediate response is usually a simple accepted acknowledgement if the caller expects one
- final business result is typically read through process instance APIs or sent onward by later tasks/events

Business scenarios:
- event bus starts an order flow
- queue message starts a claim process
- integration layer starts a case when an event arrives

Typical mapping:
- `$.data.orderId` -> `orderId`
- `$.meta.topic` -> `messageTopic`
- `"QUEUED"` -> `status`

### 5. `SIGNAL`
Use this when a named runtime signal is treated as the start trigger itself.

Typical configuration:
```json
{
  "triggerType": "SIGNAL",
  "messageTopic": "inventory.refresh"
}
```

Behavior:
- signal payload is normalized the same way as other inbound data
- `inboundMapping` still maps payload into process variables
- most signal-start flows are asynchronous in practice

Response behavior:
- if the signal starts the process through an API gateway, return an acknowledgement from `outboundMapping`
- if the signal is purely internal/system driven, use instance APIs for monitoring and output

Business scenarios:
- operational command triggers a refresh flow
- external orchestration platform sends a control signal
- internal system event starts a remediation workflow

Typical mapping:
- `$.data.signalName` -> `signalName`
- `$.data.payloadId` -> `payloadId`
- `"SIGNAL_ACCEPTED"` -> `status`

## Synchronous Vs Asynchronous Execution
This is the main conceptual model for business users.

### Synchronous
Use synchronous behavior when the caller should wait for the process to complete and receive the final business result in the same request.

Typical shape:
1. request arrives at start node
2. `inboundMapping` creates process state
3. process runs through service/script/gateway logic without pausing
4. process reaches end node
5. `End Event.outputMapping` becomes the final response

Good use cases:
- validation flows
- pricing calculation
- eligibility check
- lightweight service orchestration

### Asynchronous
Use asynchronous behavior when the process may take time, create user work, wait for signals, or coordinate multiple external steps.

Typical shape:
1. request arrives at start node
2. `inboundMapping` creates process state
3. `Start Event.outboundMapping` returns an immediate acknowledgement
4. process continues in background
5. final result appears later in instance/task/runtime views

Good use cases:
- approval workflows
- onboarding case management
- human review processes
- external callback waiting
- long-running orchestration

Typical immediate acknowledgement:
```json
{
  "instanceId": "pi_1001",
  "status": "ACCEPTED",
  "message": "Process started"
}
```

## What Happens When Human Tasks Or Signals Are Used
This is the most important wait-state behavior.

If the process reaches a human task, receive task, or wait-for-signal step:
- the process does not fail
- the process does not complete
- the process pauses in a waiting state
- current variables are preserved
- runtime status should show that the instance is waiting

The process proceeds only when the required external action happens.

### Human Task Wait
Example:
1. process starts
2. data is validated
3. a `User Task` is created for `managerApproval`
4. process waits
5. a user claims and completes the task
6. task output is mapped back into process variables
7. process continues to the next node

What resumes the process:
- `claim` API does not usually finish the work
- `complete task` API is what should move the process forward

Typical APIs:
- `GET /api/engine/tasks`
- `POST /api/engine/tasks/:taskId/claim`
- `POST /api/engine/tasks/:taskId/complete`

Business meaning:
- human work is part of the process
- the process stays active but waiting
- completion of the task provides the response needed to continue

### Signal Wait
Example:
1. process starts
2. it waits for external confirmation signal
3. instance remains paused
4. external system sends signal payload
5. signal payload is mapped into variables
6. process continues

Typical API:
- `POST /api/engine/processes/instances/:instanceId/signals`

Business meaning:
- the process is waiting for an external business event
- once the event arrives, the process resumes from that waiting point

### Receive / Message Wait
This behaves similarly to signals.

Example:
1. process starts from API
2. sends outbound work
3. waits for callback or message
4. callback/message arrives
5. runtime resumes
6. process continues to end node or next step

## How Output Works In Both Modes
This is the exact answer to the confusion between start output and end output.

### In Synchronous Mode
- start node receives input
- start node may or may not return anything immediately
- process keeps running without waiting
- end node defines the actual final business result

So in sync mode:
- `Start Event.outboundMapping` is usually optional or unused
- `End Event.outputMapping` is the important response contract

### In Asynchronous Mode
- start node receives input
- start node often returns immediate acknowledgement
- process may pause at human task, signal, or receive step
- process continues later
- end node still defines the final business result

So in async mode:
- `Start Event.outboundMapping` returns the immediate acknowledgement
- `End Event.outputMapping` defines the final process outcome
- the final outcome is usually read later through runtime APIs or downstream consumers

## Complete Business Scenarios By Category
### Manual + Synchronous
Example:
- user clicks "Calculate Offer"
- API starts process
- process runs through script/service tasks
- end node returns final offer

Recommended mapping:
- `inboundMapping`: request -> variables
- `outboundMapping`: optional or empty
- `End Event.outputMapping`: final offer response

### Manual + Asynchronous Human Approval
Example:
- user clicks "Submit Loan Request"
- process starts
- immediate response: `instanceId`, `status=ACCEPTED`
- manager task is created
- process waits
- manager completes task
- process resumes and reaches end node

Recommended mapping:
- `inboundMapping`: request -> variables
- `outboundMapping`: immediate acknowledgement
- `User Task` output mapping: task decision -> process variables
- `End Event.outputMapping`: final approval result

### Webhook + Immediate Ack
Example:
- external platform sends webhook
- start node stores payload into variables
- immediate `RECEIVED` acknowledgement is returned
- process continues in background

Recommended mapping:
- request body/header fields -> process variables
- process variables/static values -> immediate ack response

### Cron + Background Processing
Example:
- engine triggers nightly batch
- no external caller is waiting
- process runs and completes later

Recommended mapping:
- static/system values -> process variables
- no practical start response
- final result checked through instance/log/reporting APIs

### Message + Event Processing
Example:
- event bus sends `orders.created`
- process starts from message payload
- process orchestrates downstream tasks
- result is stored, forwarded, or completed later

Recommended mapping:
- message payload -> process variables
- immediate ack only if a caller expects one

### Signal + Wait/Resume Pattern
Example:
- process starts from API
- reaches wait-for-signal node
- process pauses
- external signal arrives with business payload
- process resumes and finishes

Recommended mapping:
- start input -> initial variables
- signal payload -> resume variables
- final result -> end node output mapping

## How Responses Work
The response depends on whether the process is entry-acknowledged or fully completed in the same request.

### Immediate Response From Start Node
This is controlled by `Start Event.outboundMapping`.

Use it for:
- accepted acknowledgement
- request receipt
- webhook handshake
- long-running process confirmation

Example:
```json
{
  "${variables.requestId}": {
    "target": "requestId",
    "type": "string",
    "sourceScope": "process",
    "targetScope": "output"
  },
  "\"ACCEPTED\"": {
    "target": "status",
    "type": "string",
    "sourceScope": "process",
    "targetScope": "output"
  }
}
```

Response:
```json
{
  "requestId": "REQ-1001",
  "status": "ACCEPTED"
}
```

### Final Response From End Node
This is controlled by `End Event.outputMapping`.

Use it for:
- approval result
- final order state
- generated identifiers
- final child-process outputs

Example:
```json
{
  "${variables.orderId}": {
    "target": "orderId",
    "type": "string",
    "sourceScope": "process",
    "targetScope": "output"
  },
  "${variables.approvalStatus}": {
    "target": "status",
    "type": "string",
    "sourceScope": "process",
    "targetScope": "output"
  }
}
```

Response:
```json
{
  "orderId": "ORD-1001",
  "status": "APPROVED"
}
```

## How To Read Result Later For Async Flows
If the start call only returns an acknowledgement, later process data should be read using runtime APIs.

Typical flow:
1. start process through `/api/engine/deployments/:deploymentId/processes/:processName/start`
2. receive `instanceId`
3. use instance APIs to inspect status, logs, and variables
4. use task APIs if human work is created
5. use signal APIs if the process is waiting for external continuation

Typical endpoints:
- `GET /api/engine/deployments`
- `GET /api/engine/deployments/:deploymentId/processes`
- `POST /api/engine/deployments/:deploymentId/processes/:processName/start`
- `GET /api/engine/processes/instances`
- `GET /api/engine/processes/instances/:instanceId`
- `GET /api/engine/tasks`
- `POST /api/engine/tasks/:taskId/claim`
- `POST /api/engine/tasks/:taskId/complete`
- `POST /api/engine/processes/instances/:instanceId/signals`

When a process is waiting:
- instance API should show status
- variables API/detail should show current process state
- task API should show pending human work
- signal API should resume a signalled waiting instance

## Recommended Usage By Trigger Type
- `MANUAL`: usually API/UI-driven, may be sync or async
- `WEBHOOK`: often immediate ack plus background flow
- `CRON`: no direct caller response, inspect result through instances
- `MESSAGE`: usually async event-driven start
- `SIGNAL`: usually async/internal start

Practical default:
- always use `inboundMapping`
- use `outboundMapping` only when immediate acknowledgement is needed
- use `End Event.outputMapping` for final business output

## Business Decision Rule
If the process can finish immediately without waiting, treat it as a synchronous business API and let the end node define the response.

If the process may:
- wait for a user
- wait for a signal
- wait for a callback
- run for a long time

then treat it as asynchronous:
- return acknowledgement at start if needed
- let runtime APIs and the end node represent the later final outcome

## How To Configure It Well
- Define `variableDefinitions` first. Treat this as the process contract.
- Keep inbound mapping explicit. Do not rely on hidden defaults.
- Use `localVariables` only for temporary transformation or preprocessing.
- Use `payloadSchema` to help users understand the request contract and to improve autocomplete suggestions.
- Use `outboundMapping` only if the trigger mechanism expects an acknowledgement or immediate response.

## Example: API Trigger With Immediate Ack
```json
{
  "name": "Order Intake",
  "triggerType": "WEBHOOK",
  "variableDefinitions": {
    "orderId": { "type": "string", "defaultValue": "" },
    "amount": { "type": "number", "defaultValue": "0" },
    "customerEmail": { "type": "string", "defaultValue": "" }
  },
  "inboundMapping": {
    "$.data.orderId": { "target": "orderId", "type": "string", "sourceScope": "input", "targetScope": "process" },
    "$.data.amount": { "target": "amount", "type": "number", "sourceScope": "input", "targetScope": "process" },
    "$.data.email": { "target": "customerEmail", "type": "string", "sourceScope": "input", "targetScope": "process" }
  },
  "outboundMapping": {
    "\"RECEIVED\"": { "target": "status", "type": "string", "sourceScope": "process", "targetScope": "output" },
    "${variables.orderId}": { "target": "requestId", "type": "string", "sourceScope": "process", "targetScope": "output" }
  },
  "triggerPath": "/orders/new",
  "payloadSchema": "{ \"orderId\": \"string\", \"amount\": \"number\", \"email\": \"string\" }"
}
```

Runtime effect:
- request fields are mapped into process variables
- the process starts
- the caller receives a quick response such as:

```json
{
  "status": "RECEIVED",
  "requestId": "ORD-9001"
}
```

## Example: API Trigger Without Immediate Ack
If you do not need an entry-time acknowledgement, you can skip `outboundMapping` or keep it empty and let the final result come from the end node.

Example:
```json
{
  "name": "Loan Evaluation",
  "triggerType": "WEBHOOK",
  "variableDefinitions": {
    "applicationId": { "type": "string", "defaultValue": "" },
    "amount": { "type": "number", "defaultValue": 0 },
    "decision": { "type": "string", "defaultValue": "PENDING" }
  },
  "inboundMapping": {
    "$.data.applicationId": { "target": "applicationId", "type": "string", "sourceScope": "input", "targetScope": "process" },
    "$.data.amount": { "target": "amount", "type": "number", "sourceScope": "input", "targetScope": "process" }
  }
}
```

Then later, the end node may return:
```json
{
  "outputMapping": {
    "${variables.applicationId}": { "target": "applicationId", "type": "string", "sourceScope": "process", "targetScope": "output" },
    "${variables.decision}": { "target": "decision", "type": "string", "sourceScope": "process", "targetScope": "output" }
  }
}
```

## Example: Final Output Defined Later
If the real business response should come at the end of the workflow, keep the start response minimal and define the final API output in the end node:

```json
{
  "outboundMapping": {
    "\"ACCEPTED\"": { "target": "status", "type": "string", "sourceScope": "process", "targetScope": "output" },
    "${variables.orderId}": { "target": "requestId", "type": "string", "sourceScope": "process", "targetScope": "output" }
  }
}
```

Then in the end node:
```json
{
  "outputMapping": {
    "${variables.orderId}": { "target": "orderId", "type": "string", "sourceScope": "process", "targetScope": "output" },
    "${variables.approvalStatus}": { "target": "status", "type": "string", "sourceScope": "process", "targetScope": "output" },
    "\"Process completed\"": { "target": "message", "type": "string", "sourceScope": "process", "targetScope": "output" }
  }
}
```

## Validation Notes
- `name`, `triggerType`, `variableDefinitions`, and `inboundMapping` are required.
- `cronExpression` must look like a CRON expression when used.
- `payloadSchema` must be valid JSON if provided.

## Practical Recommendations
- Always define variables first, then map request values into them.
- Keep request transport details such as headers and route params out of downstream tasks after startup. Convert them into variables first.
- Use `payloadSchema` so users can understand what `$.data.*` paths are available.
- Use `Start Event.outboundMapping` only when an immediate response is really needed.
- For most synchronous business APIs, use the end node to define the final response contract.

## Swagger / API Docs
Use the built-in API documentation to inspect the custom BPM engine contract:

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs/openapi.json`

The Swagger contract shows:
- how to trigger a process
- how start request payload is normalized
- how human task, signal, instance, and deployment APIs are intended to be used

## Runtime Meaning
This node creates the initial process state and public input contract for the workflow. Downstream service calls, tasks, gateways, subprocesses, and end nodes should read from the variables declared here.
