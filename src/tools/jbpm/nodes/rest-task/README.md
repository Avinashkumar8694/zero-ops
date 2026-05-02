# REST Task

Service-call node for invoking external HTTP APIs.

## What This Node Does
Calls a REST endpoint, optionally sends headers and a request body, then maps parts of the response back into process variables.

## Properties
- `name`: Friendly label for the call step.
- `endpoint`: Full URL. Variable interpolation is supported.
- `method`: `GET`, `POST`, `PUT`, or `DELETE`.
- `headers`: Header key/value pairs. Useful for auth and correlation IDs.
- `body`: JSON request payload for `POST` and `PUT`.
- `responseMap`: Typed mapping of response values into process variables.

## Mapping And Variable Use
- `endpoint` may reference variables such as `${variables.customerId}`.
- `headers` may use static values or variable expressions.
- `body` may contain static JSON, variable expressions, or mixed content.
- `responseMap` source values are typically JSONPath-like response selectors such as `$.profile.email`.
- `responseMap` targets are usually process variables that downstream nodes will read.

## How To Use It
- Keep the request body small and driven by process variables.
- Put secrets in environment or secret references, not directly into the model.
- Use `responseMap` for only the fields downstream nodes really need.

## Example
```json
{
  "name": "Fetch Customer Profile",
  "endpoint": "https://api.acme.com/customers/${variables.customerId}",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer ${secrets.CRM_TOKEN}"
  },
  "responseMap": {
    "$.profile.email": { "target": "customerEmail", "type": "string", "sourceScope": "output", "targetScope": "process" },
    "$.profile.segment": { "target": "customerSegment", "type": "string", "sourceScope": "output", "targetScope": "process" }
  }
}
```

## Validation Notes
- `name` and `endpoint` are required.
- `endpoint` should be a valid URL unless it is expression-driven.
- `body` must be valid JSON if provided.

## Low-Code Guidance
- Prefer autocomplete for known process variables in `endpoint`, `headers`, and `body`.
- Prefer autocomplete for response paths in `responseMap` once a sample or contract is known.
- Use static literals for fixed headers or fixed request flags where appropriate.

## Runtime Meaning
This node reads from process variables, performs an external call, and writes selected response data back into the process state.
