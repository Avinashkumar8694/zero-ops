# Start Process (V1.0.0)

Genesis primitive for manual or webhook-driven process initialization.

## Overview
The Start Event marks the entry point of a process. It determines how an orchestration instance begins and what initial data is available to the flow.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `name` | Process Label (identifier). | Text |

## Data Movement
1. **Instantiation**: Triggered via the Platform API or Manual Studio interaction.
2. **Context**: Any payload passed during initialization is transactionally mapped to the global variable pool.
3. **Execution**: The process thread transitions immediately to the first outgoing Sequence Flow.
