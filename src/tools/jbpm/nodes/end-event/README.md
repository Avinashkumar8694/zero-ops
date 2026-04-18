# End Process (V1.0.0)

Terminal primitive for successful process completion.

## Overview
The End Event marks the successful conclusion of a process path. When a token reaches this node, the process instance (or the current branch) is transactionally finalized.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `name` | Completion Label (identifier). | Text |

## Data Movement
1. **Finalization**: The engine confirms that all active threads have reached a terminal state.
2. **Persistence**: Final process variables are captured for the operational audit.
3. **Acknowledgment**: The process instance is marked as `COMPLETED`.
