# Embedded Logic (Sub-Process) (V1.0.0)

Hierarchical scope primitive for encapsulated process orchestration.

## Overview
The Sub-Process node allows for the encapsulation of complex logic into a nested scope. This improves process readability by hiding low-level implementation details from the master flow. It establishes a local variable scope that inherits from the parent by default.

## Technical Parameters
This node is structural and contains its own internal BPMN flow (Start, Tasks, End).

## Data Movement
1. **Scope Entry**: Execution transitions into the sub-process's child start event.
2. **Encapsulation**: Errors triggered within the sub-process can be caught by boundary events on the sub-process itself.
3. **Scope Exit**: Master-flow execution continues once the sub-process's internal End event is reached.

## Example: Retry Loop
- A sub-process containing a script task and a timer boundary event for automatic retries.
