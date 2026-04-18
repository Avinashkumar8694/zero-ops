# Physical Action (Manual Task) (V1.0.0)

Off-System primitive for hybrid digital-physical orchestration.

## Overview
The Manual Task node identifies a step in the process that is performed by a human actor without the use of a computer system or direct engine interaction. It provides tactical alignment for workflows that involve physical documentation, hardware manipulation, or offline inspections.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `instruction` | Detailed procedural steps for the offline actor. | Textarea |

## Data Movement
1. **Instruction Delivery**: The instructions are persisted to the operational log.
2. **Suspension**: The engine marks the step as active but does not provide an automated completion bridge.
3. **Acknowledgment**: The process continues once an external signal (API or Manual Trigger) resumes the thread.

## Example: Document Verification
- `instruction`: "Verify policy document signatures and stamp the master copy."
