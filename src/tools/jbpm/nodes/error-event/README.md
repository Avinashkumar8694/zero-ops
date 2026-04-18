# Error End (V1.0.0)

Industrial Exception primitive for transactional process failure orchestration.

## Overview
The Error End node is used to signal a non-recoverable failure within a process branch. It transactionally halts execution and triggers any matching Error Boundary Events or global exception handlers defined in the orchestration scope.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `errorCode` | The technical identifier for the error. | Text |
| `errorMessage` | Detailed context about the failure. | Textarea |

## Data Movement
1. **Exception Trigger**: Interrupts the current thread and begins stack unwinding.
2. **Correlation**: Searches for a matching Error Boundary Event on a parent scope (e.g., Sub-Process or Call Activity).
3. **Audit**: Logs the error code and message to the global audit trail.

## Example: Database Failure
- `errorCode`: `QUERY_FAILED`
- `errorMessage`: "PostgreSQL connection pool exhausted."
