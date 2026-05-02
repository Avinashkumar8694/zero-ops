# Message Start Event

Starts a process when a named message is received.

## What This Node Does
Creates a process instance from an external message or event bus message that matches the configured message name.

## Properties
- `messageName`: Identifier of the message that should start the process.

## Example
```json
{
  "messageName": "orders.created"
}
```

## Validation Notes
- Keep the message name stable and aligned with the upstream producer.
- Use a separate start event type when the process is really time-based or manual.
