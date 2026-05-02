# Parallel Gateway

AND split or AND join for concurrent execution.

## What This Node Does
Starts multiple branches at the same time or waits for multiple active branches to arrive before continuing.

## How To Use It
- Use it for true parallel work, not for conditional routing.
- Make sure downstream joins are intentional so the process does not deadlock.

## Validation Notes
- This node has no custom properties in the current implementation.
- Correct use depends on surrounding sequence flow structure.
