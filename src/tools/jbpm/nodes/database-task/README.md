# Database Task

Direct database query node for SQL-style reads or writes.

## What This Node Does
Executes a query against a configured database connection and stores the result in a process variable.

## Properties
- `name`: Friendly label.
- `connectionString`: Environment or secret key for the database connection.
- `query`: SQL or database query text.
- `params`: Parameter mapping from process variables into query placeholders.
- `resultVariable`: Process variable that receives the result.

## Mapping And Variable Use
- `params` is a typed mapping from process state into query placeholders.
- Sources are usually process variables or expressions.
- Targets are placeholder names used by the query, for example `customerId` or `statusCode`.
- `resultVariable` is the process variable where the query result will be stored.

## Example
```json
{
  "name": "Load Customer Record",
  "connectionString": "DB_URL_PROD",
  "query": "SELECT * FROM customers WHERE customer_id = :customerId",
  "params": {
    "customerId": { "target": "customerId", "type": "string", "sourceScope": "process", "targetScope": "input" }
  },
  "resultVariable": "customerRecord"
}
```

## Validation Notes
- Keep credentials outside the model.
- Match `params` keys to placeholders used in the query.
- Use a stable `resultVariable` name if downstream nodes depend on it.
