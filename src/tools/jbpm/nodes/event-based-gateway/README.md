# Event Based Gateway

Waits for one of several event-driven paths to happen first.

## What This Node Does
Routes execution based on whichever event arrives first, such as a message, signal, or timer path.

## How To Use It
- Place it before mutually exclusive event-driven branches.
- Use it when the process must react to whichever trigger wins the race.
- Keep outgoing paths easy to distinguish, for example `timeout` vs `message received`.

## Validation Notes
- This node has no custom properties in the current implementation.
- Correct behavior depends on the connected boundary or event-like paths around it.
