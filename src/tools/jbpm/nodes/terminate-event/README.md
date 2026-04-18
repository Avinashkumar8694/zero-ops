# Terminate Instance (V1.0.0)

Global Termination primitive for transactional process halting.

## Overview
The Terminate End event immediately stops all active execution threads within the current process instance. Unlike a standard end event, it does not wait for parallel branches to complete; it transactionally kills the entire context.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `name` | Termination Label (e.g., "Manual Stop"). | Text |

## Data Movement
1. **Thread Interruption**: All active and sleeping threads are transactionally halted.
2. **State Persistence**: The final process variables are persisted to the audit trail.
3. **Instance Closure**: The process is marked as `TERMINATED`.

## Example: Critical Error
- Triggered when a non-recoverable system error occurs, ensuring no further logic executes.
