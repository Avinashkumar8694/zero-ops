# Timer Start (V1.0.0)

Temporal Entry primitive for scheduled process orchestration.

## Overview
The Timer Start event allows a process to be triggered automatically based on a time-based schedule. It supports recurring cycles (Cron), specific dates (Fixed), or durations (Relative).

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `timerCycle` | The scheduling expression (ISO-8601 or Cron). | Text |

## Data Movement
1. **Scheduling**: The Zero-Scheduler monitors the expression.
2. **Trigger**: Once the condition is met, a new process instance is transactionally initialized.
3. **Variable Init**: Execution begins without input variables unless defaults are set.

## Example: Daily Sync
- `timerCycle`: `0 0 * * *` (Daily at Midnight)
- `timerCycle`: `R/PT1H` (Every Hour)
