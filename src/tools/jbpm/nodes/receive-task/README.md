# Receive Task

Wait state for an inbound correlated message, callback, or signal-like external input.

## What This Node Does
Pauses the process until the expected external message arrives.

Use this node when the workflow must wait for something outside the engine, such as:
- payment confirmation
- callback from another service
- document upload confirmation
- partner response
- manual external signal/correlation event

In business terms:
- the process sends or triggers something
- then it waits
- the instance stays active but paused
- when the expected external event arrives, the process resumes

## Properties
- `messageName`: Correlation or message identifier used to resume the process.

## When To Use It
- external callback is required before continuing
- another service must confirm completion
- waiting for payment/verification/fulfilment event
- callback-based orchestration
- signal-like business event correlation

## How Waiting Works
When the process reaches a receive task:
1. the engine pauses execution
2. the instance remains active
3. runtime should show it as waiting
4. variables remain preserved
5. process continues only when the expected message/signal arrives

Important:
- this is not an error
- this is not completion
- this is an intentional wait state

## How The Process Resumes
The process should resume when an external message or signal payload is correlated to the waiting instance.

Typical runtime flow:
1. process starts
2. outbound service call or business action happens
3. process reaches receive task
4. engine waits on `messageName`
5. external system sends matching signal/message payload
6. engine resumes the process
7. next node executes

Typical API:
- `POST /api/engine/processes/instances/:instanceId/signals`

The external caller should send:
- instance identifier or correlation context
- signal/message name
- payload if needed for later processing

## Business Scenario Examples
### Payment Confirmation
1. order process starts
2. payment request is sent
3. process waits at receive task
4. payment system later confirms success
5. process resumes and continues to fulfilment

Suggested `messageName`:
```json
{
  "messageName": "payment.confirmed"
}
```

### External Verification Callback
1. onboarding process sends verification request
2. process waits
3. partner system sends callback
4. process resumes with verification result

Suggested `messageName`:
```json
{
  "messageName": "verification.completed"
}
```

### Document Upload Wait
1. case process starts
2. customer is asked to upload document
3. process waits
4. upload event arrives
5. process continues to review

Suggested `messageName`:
```json
{
  "messageName": "document.received"
}
```

## Relationship To Start And End Nodes
If a process contains a receive task, it should usually be treated as asynchronous from the caller’s point of view.

Typical pattern:
- `Start Event.inboundMapping` initializes variables
- `Start Event.outboundMapping` returns an acknowledgement if needed
- process pauses at receive task
- signal/message API resumes it later
- `End Event.outputMapping` defines the final business result

This means:
- start response is usually immediate acknowledgement
- final result should not be expected from the same initial request

## Sync Vs Async Meaning
### Not Suitable For Pure Synchronous Request/Response
If a receive task is present, the process usually cannot complete in the same request unless the awaited event already exists internally.

### Suitable For Async Orchestration
This is the natural use case.

Examples:
- callback-based service orchestration
- event-driven integration
- partner/system confirmations
- delayed business events

## Correlation Guidance
Use a stable message name that business and technical systems can both understand.

Good examples:
- `payment.confirmed`
- `kyc.completed`
- `shipment.dispatched`
- `document.received`

Bad examples:
- generic values such as `done`
- unstable random labels with no business meaning

If runtime correlation later grows beyond simple message names, this node should still represent the waiting point while richer correlation keys can be layered in.

## Example
```json
{
  "messageName": "payment.confirmed"
}
```

## End-To-End Business Example
### Order Payment Flow
1. API starts process
2. process creates payment request
3. process reaches receive task with `messageName = payment.confirmed`
4. API caller already received `ACCEPTED` from the start node
5. payment platform later signals the instance
6. process resumes
7. end node returns final result such as:
   - `status = PAID`
   - `orderId`
   - `paymentReference`

## Validation Notes
- use a stable correlation/message name that the runtime can match reliably
- treat this node as a wait state in API design and user expectations

## Practical Recommendations
- use this node only when there is a real external event to wait for
- pair it with clear operational visibility in instance views
- make sure the external system knows how to resume the process
- do not expect the initial start call to behave like a fully synchronous business API when this node is in the flow

## Runtime Meaning
The engine should pause the process until a matching external message is received, then resume execution from this point.
