# Signal Decision (Event-Based Gateway) (V1.0.0)

Reactive branching orchestrator for multi-event signal race conditions.

## Overview
The Event-Based Gateway (Wait-OR) suspends the process instance and listens for multiple external triggers. The path belonging to the event that occurs **first** is followed, and all other listeners are transactionally cancelled.

## Technical Parameters
The gateway itself is structural. Transition logic is determined by the intermediate events (Timer, Message, Signal) connected to the outgoing flows.

## Data Movement
1. **Suspension**: The process thread halts and enters a listening state.
2. **Race Condition**: Multiple listeners (e.g., "Payment Received" vs "24h Expiry") compete.
3. **Resumption**: Execution resumes on the winner's branch.

## Example: Approval SLA
- Path A: Awaits `APPROVE_SIGNAL`
- Path B: Timer set to `48h` (Auto-Reject path)
