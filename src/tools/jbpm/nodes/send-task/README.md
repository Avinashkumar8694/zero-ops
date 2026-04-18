# Send Signal (V1.0.0)

Outbound Notification primitive for fire-and-forget orchestration.

## Overview
The Send Task node is used to send asynchronous messages or signals to external systems. Unlike a Service Task, it does not wait for a response body; it simply ensures the signal is transactionally dispatched.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `messageId` | Protocol/Channel (EMAIL, SMS, WEBHOOK, KAFKA). | Select |
| `target` | Recipient ID or Topic name. | Text |
| `payload` | Data body to be sent in the signal. | Snippet |

## Data Movement
1. **Mapping**: Resolves all variable expressions in the payload.
2. **Dispatch**: Transmits the data via the selected channel.
3. **Execution**: The process instance continues immediately.

## Example: Kafka Alert
- `messageId`: `KAFKA`
- `target`: `topic.ops.alerts`
- `payload`: `{ "msg": "System Threshold Exceeded" }`
