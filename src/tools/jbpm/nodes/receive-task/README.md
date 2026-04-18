# Wait for Signal (Receive Task) (V1.0.0)

Inbound Synchronization primitive for signal-driven process suspension.

## Overview
The Receive Task node pauses the process execution thread and waits for an inbound signal or message from an external system. It is used for correlating asynchronous responses.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `messageName` | The identifier for the expected inbound signal. | Text |

## Data Movement
1. **Suspension**: The process enters a persistent wait state.
2. **Correlation**: Matches the signal based on the `messageName` and Correlation ID.
3. **Resumption**: Execution continues with the injected message payload.

## Example: Payment Confirmation
- `messageName`: `PAYMENT_SUCCESS_ACK`
- The process resumes only when the payment gateway sends this specific signal.
