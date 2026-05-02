# Timer Start Event

Starts a process on a time cycle or schedule.

## What This Node Does
Creates a new process instance based on a timer expression such as a CRON-like schedule.

## Properties
- `timerCycle`: CRON or timer cycle expression.

## Example
```json
{
  "timerCycle": "0 0 * * *"
}
```

## Validation Notes
- Use a valid schedule expression that your runtime understands.
- Use the generic start event if you want schedule plus richer variable contract configuration.
