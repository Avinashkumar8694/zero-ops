# Standard Service Tasks

Beyond the custom REST and Script nodes, the Zero-Flow Generic Renderer supports several built-in jBPM service tasks for common operations.

## 1. Email Node
Used for sending notifications via SMTP.

### Schema
```json
{
  "id": "send_welcome_email",
  "type": "EMAIL",
  "config": {
    "from": "no-reply@zero.com",
    "to": "#{userEmail}",
    "subject": "Welcome to Zero-Ops",
    "body": "Hi #{userName}, your account is active.",
    "isHtml": true
  }
}
```

## 2. Log Node
Used for auditing and debugging system state.

### Schema
```json
{
  "id": "audit_log",
  "type": "LOG",
  "config": {
    "message": "Processing Order ID: #{orderId} at status: #{status}",
    "level": "INFO"
  }
}
```

## 3. Java Task Node
Used to invoke a specific Java method on a singleton bean or a static class.

### Schema
```json
{
  "id": "calculate_hash",
  "type": "JAVA_TASK",
  "config": {
    "class": "com.zero.utils.SecurityUtils",
    "method": "sha256",
    "params": ["#{payload}"]
  },
  "outputMapping": {
    "hashResult": "return"
  }
}
```

> [!IMPORTANT]
> Java Task nodes require the target classes to be present in the KIE Server's classpath (either in the KJAR or the server's `lib` folder).
