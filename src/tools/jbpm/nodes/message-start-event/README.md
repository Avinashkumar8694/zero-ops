# Message Start (V1.0.0)

Event-Driven Entry primitive for signal-based process orchestration.

## Overview
The Message Start event triggers a process instance when a specific named message is received from an external system or service. It establishes a reactive entry point for asynchronous workflows.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `messageName` | The unique identifier for the inbound signal. | Text |

## Data Movement
1. **Correlation**: The engine listens for a signal matching the `messageName`.
2. **Hydration**: Any payload data attached to the signal is transactionally injected into the process variables.
3. **Trigger**: A new instance is transactionally initialized.

## Example: User Registration
- `messageName`: `USER_REGISTERED_EVENT`
- The payload `{ "email": "..." }` becomes `variables.email`.
