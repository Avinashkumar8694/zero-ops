# Slack Ops (V1.0.0)

Industrial ChatOps primitive for interactive alerts and notifications.

## Overview
The Slack Ops node enables reactive communication with engineering teams. It supports mrkdwn formatting, interactive buttons (via Bolt), and direct channel dispatching via incoming webhooks.

## Technical Parameters
| Field | Description | Type |
|-------|-------------|------|
| `channel` | The target channel name or ID. | Text |
| `message` | The content of the alert (Supports mrkdwn). | Snippet |
| `webhookUrl` | The environment variable key holding the Webhook URL. | Text |

## Data Movement
1. **Formatting**: Resolves variables within the mrkdwn block.
2. **Dispatch**: Transmits the structured block to the Slack API.
3. **Execution**: Continues once Slack acknowledges the payload.

## Example: Incident Alert
```json
{
  "channel": "#critical-ops",
  "message": "*ALERT*: System Threshold for node ${variables.nodeId} exceeded!",
  "webhookUrl": "PROD_SLACK_WEBHOOK"
}
```
