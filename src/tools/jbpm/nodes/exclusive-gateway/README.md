# Exclusive Gateway

Single-choice decision point.

## What This Node Does
Chooses exactly one outgoing path based on sequence flow conditions connected after the gateway.

## Properties
- `name`: Friendly label for the decision point.

## How To Use It
- Put conditions on outgoing sequence flows, not inside the gateway.
- Mark one route as default if the flow should always continue.

## Example
Use a gateway named `Is Credit Approved?` with outgoing flows such as:
- `approved` path with `variables.creditDecision === 'APPROVED'`
- default `rejected` path

## Validation Notes
- The gateway itself is lightweight; most validation belongs to outgoing sequence flows.
