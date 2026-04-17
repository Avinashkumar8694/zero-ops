# Data Flow and Variable Mapping

The Zero-Flow Generic Renderer uses a hierarchical data model to manage state across the process lifecycle.

## 1. Variable Scopes

| Scope | Persistence | Accessibility |
| :--- | :--- | :--- |
| **Case File** | Long-term (DB) | Global across the entire Case Instance. Used for shared state. |
| **Node Input** | Task Duration | Local to a single node. Injected from the Case File. |
| **Node Output** | Immediate | Extracted from the completed node and mapped back to the Case File. |
| **Global Secrets** | Transient | Injected from Vault at runtime. Never persisted. |

## 2. Dynamic Mapping Syntax
We use a unified interpolation syntax `#{...}` for inputs and **JSONPath** for outputs.

### Input Interpolation
- `#{customerName}`: Simple variable lookup.
- `#{order.items[0].price}`: JSON path lookup within a variable.
- `#{secrets.API_KEY}`: Secure vault lookup.

### Output Mapping (`outputMapping`)
Maps the result of a Service Task (REST response, Script result, or User Task form) back to the Case File.
```json
"outputMapping": {
  "storedVarName": "$.path.in.result.json"
}
```

## 3. Data Associations
Each node definition in the JSON DSL defines how data flows in and out:
- **`inputs`**: A dictionary where keys are the expected node parameters and values are the interpolated strings.
- **`outputs`**: (Optional) For specialized tasks that return complex objects.

> [!IMPORTANT]
> To prevent variable collision in parallel flows, use unique prefixes in your `outputMapping` or use the `nodeId` as a namespace.
