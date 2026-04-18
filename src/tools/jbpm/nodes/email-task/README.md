# Email Dispatch (V1.0.0)

Industrial communication primitive supporting SendGrid and Nodemailer SMTP.

## Overview
The Email Dispatch node provides a unified interface for outbound communication. Orchestrators can choose between modern API-based delivery (SendGrid) or traditional SMTP orchestration (Nodemailer).

## Technical Parameters

### Common Fields
| Field | Description | Type |
|-------|-------------|------|
| `provider` | The dispatch engine (SENDGRID or NODEMAILER). | Select |
| `to` | Recipient address (supports interpolation). | Text |
| `subject` | Subject line (supports interpolation). | Text |
| `body` | HTML or text content. | Snippet |

### Provider: SENDGRID
| Field | Description | Type |
|-------|-------------|------|
| `apiKey` | The SendGrid API Key (SG.***). | Text |

### Provider: NODEMAILER (SMTP)
| Field | Description | Type |
|-------|-------------|------|
| `smtpHost` | Path to the SMTP server. | Text |
| `smtpPort` | Port number (e.g., 587, 465). | Text |
| `smtpUser` | Username for SMTP auth. | Text |
| `smtpPass` | Password for SMTP auth. | Password |

## Data Movement
1. **Dynamic Hydration**: Resolves variables in the `to`, `subject`, and `body` fields.
2. **Authentication**: Uses either the API Key or SMTP credentials depending on the `provider` selection.
3. **Acknowledgment**: The process thread resumes once the dispatch is successfully queued by the provider.

## Example: SendGrid Mode
```json
{
  "provider": "SENDGRID",
  "apiKey": "${secrets.SENDGRID_API_KEY}",
  "to": "dev@ops.ai",
  "subject": "System Alert: ${variables.errorType}"
}
```

## Example: SMTP Mode
```json
{
  "provider": "NODEMAILER (SMTP)",
  "smtpHost": "smtp.mailtrap.io",
  "smtpPort": "587",
  "to": "test@ops.ai"
}
```
