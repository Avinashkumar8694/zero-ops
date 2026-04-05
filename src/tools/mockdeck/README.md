# MockDeck

`MockDeck` is the mock API and API workflow testing tool inside `zero-ops`.

It has two workspaces:

- `Mock Manager`: register and manage mock APIs, proxy responses, templated responses, media responses, and individual API triggering.
- `Runner Workspace`: model end-to-end scenarios as connected nodes, execute chained requests, apply dependencies between nodes, run CSV/Excel driven data sets, and inspect live/final analytics.

New collections can also seed:

- a demo folder structure
- mock plus real API examples
- a sample dataset
- a sample runner workflow
- collection environments with one active by default

## Start

```bash
zero-ops mockdeck
```

Default URLs:

- Mock manager: `http://127.0.0.1:8381/__mockdeck`
- Runner workspace: `http://127.0.0.1:8381/__mockdeck/runner`

## CLI

### List mocks

```bash
zero-ops mockdeck list
zero-ops mockdeck list --json
```

### Add a mock

```bash
zero-ops mockdeck add \
  --name "Health" \
  --method GET \
  --path /api/health \
  --type json \
  --body '{"ok":true}'
```

### Add a media mock

```bash
zero-ops mockdeck add \
  --name "Avatar" \
  --method GET \
  --path /assets/avatar \
  --type media \
  --file ./avatar.png \
  --content-type image/png
```

### Add a proxy mock

```bash
zero-ops mockdeck add \
  --name "Users proxy" \
  --method GET \
  --path /api/users \
  --type proxy \
  --proxy-url https://api.example.com
```

### Delete mocks

```bash
zero-ops mockdeck delete <mock-id>
zero-ops mockdeck clear
```

### Runner workflows

```bash
zero-ops mockdeck workflow-list
zero-ops mockdeck workflow-run <workflow-id>
```

## Mock Manager

The mock manager is for individual API testing and mock registration.

### Supported response types

- `json`
- `text`
- `html`
- `xml`
- `media`
- `proxy`

### Handlebars template context

Mock templates can reference:

- `mock`
- `request.method`
- `request.path`
- `request.query`
- `request.params`
- `request.headers`
- `request.body`
- `request.rawBody`
- `now`

Examples:

```hbs
{
  "ok": true,
  "userId": "{{request.params.id}}",
  "query": "{{json request.query}}"
}
```

```hbs
Hello {{default request.query.name "Guest"}}
```

### Media support

For media mocks, the uploaded file is stored locally and served back with the configured content type.

This is useful for:

- mock image responses
- PDF downloads
- audio/video test endpoints
- binary asset simulation

### Proxy support

Proxy mocks forward requests to an upstream target while keeping the same local MockDeck route.

Use this when:

- only some APIs should be mocked locally
- the rest should continue to hit a real backend
- you want to place a local façade in front of a real service

## Collection Environments

Each collection can now store environments and mark one as active.

Example variables:

```text
base_url: http://127.0.0.1:8381
tenant: demo-local
default_timeout_ms: 15000
runner_label: local-seeded-flow
```

Use environments when:

- local and staging need different base values
- scripts should read named variables instead of hardcoded strings
- templates should reference reusable environment data

Where to use them:

- in Handlebars templates: `{{env.base_url}}`
- in runner scripts: `ctx.environment.variables.base_url`
- active runtime globals are also initialized from environment variables, so `ctx.globals.tenant` is available too

The active environment is selected on the collection, and a workflow can explicitly choose which saved environment to run with.

## Triggering individual APIs

The `Trigger Request` panel behaves like a compact Postman request tab:

- choose method
- enter URL
- pass headers
- send body
- inspect response status, headers, body, and timing

Use this for scenario 1: testing APIs individually.

## Runner Workspace

The runner is meant for scenario 2 and scenario 3: chaining APIs, declaring dependencies, scripting, and data-driven execution.

### Runner path

Open:

`/__mockdeck/runner`

### Runner model

A workflow contains:

- metadata: name and description
- global settings: headers, iterations, concurrency, timeout, stop-on-error
- optional dataset: CSV or Excel
- nodes: each node is one request step

Each node contains:

- method
- URL or linked MockDeck mock
- headers
- body
- dependency list
- mappings
- pre-script
- post-script
- notes

### Drag and drop nodes

Nodes are draggable on the canvas. Their position is stored with the workflow so the scenario layout stays visual and reusable.

Connections are expressed by the `dependsOn` list on each node and rendered on the canvas.

### Dependency chaining

You can connect multiple APIs and run them in order.

Examples:

- login node produces token
- next node maps `response.body.token` into `authorization` header
- next node uses `row.userId` from a dataset
- scripts can store values into globals and later steps can read them

### Mapping format

Mappings are configured as JSON on each node.

Example:

```json
[
  {
    "sourceType": "step",
    "sourceNodeId": "login-node-id",
    "sourcePath": "response.body.token",
    "targetType": "header",
    "targetKey": "authorization"
  },
  {
    "sourceType": "row",
    "sourcePath": "userId",
    "targetType": "bodyField",
    "targetKey": "payload.userId"
  }
]
```

Supported `sourceType` values:

- `step`
- `row`
- `global`

Supported `targetType` values:

- `header`
- `query`
- `var`
- `bodyField`

### Pre and post scripts

Each node supports a `preScript` and `postScript`.

The script is plain JavaScript and can return an object.

Available context:

- `workflow`
- `node`
- `scenario`
- `row`
- `request`
- `response` in post-script
- `steps`
- `globals`
- `environment`

Available helpers:

- `helpers.get(object, path)`
- `helpers.set(object, path, value)`
- `helpers.assert(condition, message)`

Example pre-script:

```js
return {
  headers: {
    "x-correlation-id": `${ctx.scenario.iteration}-${ctx.scenario.rowIndex}`
  }
};
```

Example post-script:

```js
helpers.assert(ctx.response.statusCode === 200, "Expected HTTP 200");
return {
  vars: {
    accessToken: ctx.response.body.token
  }
};
```

### Script context reference

`ctx.row`

- the current dataset row for this scenario
- example: `ctx.row.username`

`ctx.environment`

- the selected environment object for this workflow run
- use `ctx.environment.name`
- use `ctx.environment.variables.base_url`

`ctx.globals`

- runtime variables collected during the same scenario
- values returned from earlier scripts through `vars`
- example: `ctx.globals.accessToken`

`ctx.request`

- in pre-script: the request about to be sent
- fields include URL, headers, and body

`ctx.response`

- available in post-script
- fields include `statusCode`, `headers`, `body`, `ok`, and `durationMs`

`ctx.steps`

- all completed upstream steps in the same scenario
- useful when a later script wants to inspect earlier request or response data

### What is row?

When a workflow uses a CSV or Excel dataset, each row is one input record for a scenario run.

Example row:

```json
{
  "username": "alice",
  "userId": 101
}
```

Then inside runner templates or scripts:

- `{{row.username}}`
- `{{row.userId}}`
- `ctx.row.username`
- `ctx.row.userId`

### Setting and reading variables

Set variables in a script:

```js
return {
  vars: {
    accessToken: ctx.response.body.token,
    currentUserId: ctx.response.body.userId
  }
};
```

Read them later:

```js
return {
  headers: {
    authorization: String(ctx.globals.accessToken || "")
  }
};
```

### Request and response access

Useful pre-script access:

- `ctx.request.url`
- `ctx.request.headers`
- `ctx.request.body`

Useful post-script access:

- `ctx.response.statusCode`
- `ctx.response.ok`
- `ctx.response.headers`
- `ctx.response.body`
- `ctx.response.durationMs`

### Practical guidelines

- use environments for reusable base values such as URLs, tenant names, tokens, or timeouts
- use dataset rows for input variation
- use mappings when values should flow automatically from one node to the next
- use pre-script for request shaping
- use post-script for assertions and extracting values
- keep scripts small and return only what later nodes really need

### Seeded sample flow

When you create a fresh collection without custom items, MockDeck seeds a demo flow with examples of:

- login mock -> profile mock -> real API chaining
- dataset row usage with `row.username` and `row.userId`
- mapping a previous response token into the next request header
- pre-script usage for setting variables and headers
- post-script usage for assertions and persisting variables
- environment selection and access

The seeded environments include:

- `Local Demo`
- `Staging Demo`

The seeded scripts are intentionally commented so users can learn from them directly in the UI.

Example ideas shown in the sample:

- `ctx.environment.variables.tenant`
- `ctx.globals.accessToken`
- `helpers.assert(...)`
- returning `vars` from scripts
- using environment values in request headers

### CSV and Excel data support

Datasets support:

- `.csv`
- `.xlsx`
- `.xls`

Each row becomes runtime data available as `row`.

Typical uses:

- data-driven login flows
- bulk validation against many users
- regression testing across many payload variants
- repeatable load-like execution over the same workflow

### Load-style execution

The runner currently supports:

- `iterations`
- `concurrency`
- per-node timeout
- stop-on-error control

That means you can run a workflow repeatedly across dataset rows and observe timing, success/failure, and per-node throughput.

## Analytics

MockDeck exposes analytics at two levels.

### Live analytics

During execution:

- scenario start/completion events
- node start/completion events
- progress counters
- current run status

### Final analytics

After execution:

- total scenarios
- total requests
- success count
- failure count
- average latency
- p95 latency
- throughput per second
- per-node request counts
- per-node success/failure
- per-node average latency
- per-node p95 latency

## Suggested scenario patterns

### 1. Test a single API

Use the mock manager trigger panel.

### 2. Connect multiple APIs with dependency flow

Use the runner:

- create one node per API
- make downstream nodes depend on upstream nodes
- map response values into headers, query params, or request body fields

### 3. Add pre/post validation and dynamic datasets

Use:

- dataset upload for CSV/Excel
- pre-scripts for request shaping
- post-scripts for assertions and extracted variables

### 4. Run load-style flows with analytics

Set:

- iterations
- concurrency
- stop-on-error

Then watch live progress and final metrics.

## Storage

MockDeck stores its data under:

- `$ZERO_OPS_DATA_DIR/mockdeck` if `ZERO_OPS_DATA_DIR` is set
- otherwise `~/.zero-ops/mockdeck`
- otherwise a workspace-local fallback under `.zero-ops-data/mockdeck`

Stored items include:

- mocks
- datasets
- workflows
- local media assets
