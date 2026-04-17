# Business Rule Node Configuration

The `Business Rule` node is used to execute complex decision logic defined in DMN (Decision Model and Notation) or Drools (Rule Language) without manual scripting.

## Configuration Schema

```json
{
  "id": "evaluate_discount",
  "type": "BUSINESS_RULE",
  "config": {
    "namespace": "https://kiegroup.org/dmn/_BCB",
    "modelName": "DiscountModel",
    "decisionName": "FinalDiscount",
    "inputs": {
      "customerType": "#{customer.type}",
      "orderTotal": "#{order.total}"
    }
  },
  "outputMapping": {
    "discountPercentage": "$.discount",
    "isEligible": "$.eligible"
  }
}
```

## Parameter Details

| Attribute | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `namespace` | The URI namespace of the DMN model. | Yes (DMN) | - |
| `modelName` | The name of the DMN file/model. | Yes (DMN) | - |
| `decisionName`| The specific decision node inside the DMN to evaluate. | No | `Final Decision` |
| `inputs` | Data variables mapped *to* the DMN input nodes. | Yes | `{}` |

## Execution Logic
1.  **Context Building**: The Orchestrator gathers all `inputs` from the Case File.
2.  **DMN Invocation**: Calls the KIE Server DMN evaluation endpoint.
3.  **Result Mapping**: The `outputMapping` parses the resulting decision JSON and updates the Case File.

> [!TIP]
> Use Business Rule nodes for complex pricing, eligibility, or risk assessment logic to keep the workflow clean and decoupled from business rules.
