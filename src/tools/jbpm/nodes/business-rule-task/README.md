# Decision Table (Business Rule Task) (V1.0.0)

Policy Enforcement primitive for DMN-based decision orchestration.

## Overview
The Business Rule Task node integrates with the Zero-Decision engine (DMN). It allows for complex logic (Credit Scoring, Discount Calculation) to be managed in a declarative Decision Table rather than hardcoded in process flows.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `decisionRef` | The ID of the DMN Decision Table. | Text |
| `inputMap` | Variables to pass to the decision engine. | Key-Value |
| `resultVariable` | Name of the variable to store the result. | Text |

## Data Movement
1. **Preparation**: Maps process variables to the decision table inputs.
2. **Evaluation**: Triggers the DMN Hit-Policy (Unique, First, Collect).
3. **Hydration**: Resulting conclusions are transactionally injected into the process context.

## Example: Credit Approval
- `decisionRef`: `CREDIT_SCORE_TABLE`
- `inputMap`: `{ "age": 25, "income": 50000 }`
- `resultVariable`: `approvalStatus`
