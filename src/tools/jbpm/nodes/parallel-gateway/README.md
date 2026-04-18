# Parallel Fork (V1.0.0)

Concurrency Orchestrator for multi-threaded split and join logic.

## Overview
The Parallel Gateway (AND) is used to create concurrent paths within a process. It transitions all outgoing flows simultaneously. On merging, it waits for all incoming active threads to arrive before continuing.

## Technical Parameters
This node is structural and does not require manual configuration. Logic is determined by the topology of outgoing Sequence Flows.

## Data Movement
1. **Fork**: Clones the process context into N concurrent execution threads.
2. **Synchronization**: Blocks the process until all parallel segments complete.
3. **Variable Safety**: All threads share access to the global variable pool.

## Example: Simultaneous Ops
- Thread A: Dispatch Email
- Thread B: Register Database Record
*Both execute concurrently.*
