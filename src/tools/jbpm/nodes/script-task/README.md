# Automation Script Task (V1.0.0)

Orchestration Primitive for high-performance computational logic.

## Overview
The Script Task executes tactical Javascript logic snippets within the Zero-Logic sandbox environment. It is designed for variable mutation, mathematical calculations, and internal data transformation without external IO.

## Technical Parameters

| Field | Description | Type |
|-------|-------------|------|
| `script` | The Javascript logic to execute. Variable context `variables` is directly accessible. | Snippet |
| `language` | Runtime language (Default: javascript). | Enum |

## Data Movement
1. **Execution**: The engine spawns a sandboxed function context.
2. **Mutation**: The `variables` object is passed by reference; any modifications are persisted back to the process state.
3. **Résume**: Execution is synchronous and immediate; the process resumes following script completion.

## Example: Calculating Dynamic Discount
```javascript
const total = variables.cart_total || 0;
if (total > 5000) {
  variables.discount = total * 0.15;
  variables.tier = "PLATINUM";
} else {
  variables.discount = total * 0.05;
  variables.tier = "GOLD";
}
```
