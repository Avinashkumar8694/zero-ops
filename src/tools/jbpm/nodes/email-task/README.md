# Email Task

Outbound email service node.

## What This Node Does
Sends an email using either SendGrid or SMTP-style configuration through Nodemailer.

## Properties
- `name`: Friendly label.
- `provider`: `SENDGRID` or `NODEMAILER (SMTP)`.
- `to`: Recipient address.
- `subject`: Subject line.
- `body`: Email body. HTML and variable interpolation are supported.
- `apiKey`: Required for SendGrid.
- `smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`: Used for SMTP mode.

## Example
```json
{
  "name": "Notify Customer",
  "provider": "SENDGRID",
  "to": "${variables.customerEmail}",
  "subject": "Order ${variables.orderId} received",
  "body": "<p>Thanks for your order.</p>",
  "apiKey": "${secrets.SENDGRID_API_KEY}"
}
```

## Validation Notes
- Select the provider first because it controls which auth fields matter.
- Keep auth tokens and SMTP passwords in secrets.
- Validate recipient addresses before runtime where possible.
