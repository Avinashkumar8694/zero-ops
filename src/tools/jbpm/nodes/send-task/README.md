# Send Task

Outbound message dispatch node.

## What This Node Does
Sends a message to an external recipient, topic, or channel such as email, SMS, webhook, or Kafka.

## Properties
- `messageId`: Message transport type.
- `target`: Recipient, endpoint, or topic.
- `payload`: Outbound body or event payload.

## Example
```json
{
  "messageId": "WEBHOOK",
  "target": "https://hooks.acme.com/order-status",
  "payload": "{ \"orderId\": \"${variables.orderId}\", \"status\": \"APPROVED\" }"
}
```

## Validation Notes
- Choose the transport type first.
- Keep payload format consistent with the receiver.
