# Error End Event

Terminal node for intentional process failure.

## What This Node Does
Ends the current path with an error code and error message. Use this when the process should stop and surface a business or technical failure.

## Properties
- `errorCode`: Stable machine-readable error identifier.
- `errorMessage`: Human-readable explanation.

## Example
```json
{
  "errorCode": "CUSTOMER_NOT_ELIGIBLE",
  "errorMessage": "Customer failed eligibility checks and the process cannot continue."
}
```

## Validation Notes
- Keep `errorCode` stable for dashboards, APIs, and automation.
- Use actionable messages so operators understand the failure quickly.
