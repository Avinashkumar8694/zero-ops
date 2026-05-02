# Business Rule Task

Decision node for invoking a rule or decision table.

## What This Node Does
Sends process data into a decision engine and stores the result in a single output variable. Use this when business logic should be centralized in rules instead of embedded in scripts.

## Properties
- `name`: Display label.
- `decisionRef`: Identifier of the decision, ruleset, or decision table to invoke.
- `inputMap`: Data sent into the rule engine.
- `resultVariable`: Process variable that receives the decision result.

## Mapping And Variable Use
- `inputMap` is a low-code typed mapping from process variables into decision inputs.
- Sources are usually process variables or expressions.
- Targets are rule input names expected by the decision asset.
- `resultVariable` should be a stable process variable name because downstream nodes may autocomplete and depend on it.

## Example
```json
{
  "name": "Credit Decision",
  "decisionRef": "Credit_Check_Table",
  "inputMap": {
    "customerAge": { "target": "customerAge", "type": "number", "sourceScope": "process", "targetScope": "input" },
    "annualIncome": { "target": "annualIncome", "type": "number", "sourceScope": "process", "targetScope": "input" }
  },
  "resultVariable": "creditDecision"
}
```

## Validation Notes
- `decisionRef` should point to a real decision artifact.
- `resultVariable` should be stable because downstream nodes will depend on it.
