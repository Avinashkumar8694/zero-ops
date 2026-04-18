# Data Bridge (Database Task) (V1.0.0)

Industrial database primitive for tactical SQL/NoSQL orchestration.

## Overview
The Data Bridge node enables high-performance persistence logic within a process flow. It supports parameterized queries, transaction safety, and dynamic result hydration into the Zero-Orchestration variables.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `connectionString` | The environment variable key holding the DB URL. | Text |
| `query` | The SQL or Query snippet to execute. | Snippet |
| `params` | Mapping of variables to query placeholders. | Key-Value |
| `resultVariable` | Name of the variable to store the result set. | Text |

## Data Movement
1. **Preparation**: The node maps variables from the `params` table to the query placeholders.
2. **Execution**: Executes the query against the target connection pool.
3. **Hydration**: The resulting rows or documents are injected into `variables.[resultVariable]`.

## Example: Fetch User
```json
{
  "connectionString": "POSTGRES_MASTER",
  "query": "SELECT * FROM users WHERE status = :status LIMIT 10",
  "params": { "status": "ACTIVE" },
  "resultVariable": "activeUsers"
}
```
