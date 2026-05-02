# Script Task

Inline computation node for lightweight process logic.

## What This Node Does
Runs a script snippet during process execution. Use it for transformations, derived values, branching preparation, or compact business logic that does not justify a separate service.

This node is the best place to shape process data before passing it to another task, service call, rule, or end response.

## Properties
- `name`: Friendly step label.
- `script`: The code to execute.
- `language`: Currently `javascript`.
- `outputMapping`: Maps computed local values into process variables.

## Mapping Behavior
The script should produce local or returned values such as `discount`, `finalAmount`, or `riskLevel`. `outputMapping` then decides which of those values become durable process variables.

You may also use:
- direct local names: `discount`
- expressions if the runtime supports them
- static literals when a fixed value should be written alongside computed ones

## Variable Model
Think of this node as working with two main variable scopes:

- `variables`
  The current process state available when the script starts.
- local/script values
  Values you create inside the script or return from it. These are not persisted unless mapped through `outputMapping`.

### What You Can Read
Inside the script, read process variables through `variables`:

```javascript
const amount = Number(variables.amount || 0);
const customerType = variables.customerType || 'STANDARD';
const existingDiscount = Number(variables.discountAmount || 0);
```

Typical examples:
- `variables.amount`
- `variables.customerId`
- `variables.customer`
- `variables.order.status`

### What You Can Create
Inside the script, create local computed values:

```javascript
const subtotal = Number(variables.amount || 0);
const vip = variables.customerType === 'VIP';
const discount = vip ? subtotal * 0.15 : subtotal * 0.05;
const finalAmount = subtotal - discount;
```

These values remain local until you return them and map them.

## Recommended Script Pattern
Return a plain object from the script. Treat that returned object as the local output contract for this node.

```javascript
const subtotal = Number(variables.amount || 0);
const customerType = variables.customerType || 'STANDARD';
const isVip = customerType === 'VIP';

const discountRate = isVip ? 0.15 : 0.05;
const discount = subtotal * discountRate;
const finalAmount = subtotal - discount;

return {
  subtotal,
  customerType,
  isVip,
  discountRate,
  discount,
  finalAmount
};
```

## Output Mapping Styles
`outputMapping` supports multiple low-code styles.

### 1. Local Value To Process Variable
Use the returned/local key as the source:

```json
{
  "discount": { "target": "discountAmount", "type": "number", "sourceScope": "local", "targetScope": "process" },
  "finalAmount": { "target": "payableAmount", "type": "number", "sourceScope": "local", "targetScope": "process" }
}
```

### 2. Static Literal To Process Variable
Write a fixed value directly:

```json
{
  "\"CALCULATED\"": { "target": "pricingStage", "type": "string", "sourceScope": "local", "targetScope": "process" },
  "true": { "target": "priceComputed", "type": "boolean", "sourceScope": "local", "targetScope": "process" }
}
```

### 3. Expression-Style Value
If your runtime supports expression-like values, you may use them as mapping sources:

```json
{
  "${variables.customerId}": { "target": "lastCalculatedForCustomer", "type": "string", "sourceScope": "local", "targetScope": "process" }
}
```

## Full Example
```json
{
  "name": "Compute Discount",
  "language": "javascript",
  "script": "const subtotal = Number(variables.amount || 0); const customerType = variables.customerType || 'STANDARD'; const isVip = customerType === 'VIP'; const discountRate = isVip ? 0.15 : 0.05; const discount = subtotal * discountRate; const finalAmount = subtotal - discount; return { subtotal, customerType, isVip, discountRate, discount, finalAmount };",
  "outputMapping": {
    "discount": { "target": "discountAmount", "type": "number", "sourceScope": "local", "targetScope": "process" },
    "finalAmount": { "target": "payableAmount", "type": "number", "sourceScope": "local", "targetScope": "process" },
    "\"CALCULATED\"": { "target": "pricingStage", "type": "string", "sourceScope": "local", "targetScope": "process" },
    "true": { "target": "priceComputed", "type": "boolean", "sourceScope": "local", "targetScope": "process" }
  }
}
```

## How To Use It
- Keep scripts focused and deterministic.
- Use this for data shaping, not for large integrations.
- Prefer output mappings instead of mutating many variables implicitly.
- Return a compact object and explicitly map only the values the rest of the process needs.
- Use clear local names like `discount`, `finalAmount`, `riskLevel`, or `nextStage`.

## Validation Notes
- `name` and `script` are required.
- Mapping rows must have a local source key and a process target key.
- Keep the returned object shape stable if downstream nodes rely on its mapped outputs.

## Runtime Meaning
This node should evaluate the snippet in a controlled context, capture returned or local values, and then apply `outputMapping` into process variables.
