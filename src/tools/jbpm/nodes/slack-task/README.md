# Slack Task

ChatOps notification node for Slack.

## What This Node Does
Sends a Slack message to a channel or user using a configured webhook URL.

## Properties
- `name`: Friendly label.
- `channel`: Slack channel or destination.
- `message`: Slack message body, including interpolation or mrkdwn.
- `webhookUrl`: Environment or secret key pointing to the webhook URL.

## Example
```json
{
  "name": "Notify Ops",
  "channel": "#ops-alerts",
  "message": "*Order ${variables.orderId}* is waiting for manual review.",
  "webhookUrl": "${secrets.SLACK_WEBHOOK_URL}"
}
```

## Validation Notes
- Keep the webhook URL out of plain model text when possible.
- Keep Slack messages short and actionable.
