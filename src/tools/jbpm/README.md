# jBPM Tool (`jbpm`)

A professional-grade workflow orchestration and process rendering tool for `zero-ops`. This tool allows for dynamic BPMN 2.0 process generation and automated deployment to jBPM KIE Servers using simple JSON configurations.

## 🚀 Key Features
- **Dynamic Process Generation**: Convert JSON DSL directly into jBPM-compatible BPMN 2.0 XML.
- **Automated KJAR Packaging**: Create Maven project structures and KJAR bundles with custom names and versions.
- **Remote Deployment**: One-click deployment to KIE Server and automatic Business Central registration.
- **REST Orchestration**: Native support for configurable REST service tasks.

## 📋 CLI Usage

### 🛠 Configuration
Set your KIE Server credentials:
```bash
zero-ops jbpm config set --url "http://localhost:8080/kie-server" --user "krisv" --pass "krisv"
```

### 🔨 Build & Deploy
```bash
# Build and Deploy in one flow
zero-ops jbpm build my-project 1.0.0
zero-ops jbpm deploy my-container my-project 1.0.0
```

### 🏃 Run (CLI)
Trigger a dynamic workflow with input data:
```bash
zero-ops jbpm run ./onboarding_sample.json --data '{"employeeName": "Alice Stein", "yearsExperience": 10}'
```

## 📡 Direct API Usage (CURL)

If you have already deployed your container, you can trigger the Generic Interpreter directly via the jBPM REST API (useful for CI/CD or external systems).

### 🚀 Trigger a Case Instance
This starts the execution of the "GenericCase" definition using your custom variables and workflow blueprint.

**Endpoint:** `POST /kie-server/services/rest/server/containers/{containerId}/cases/GenericCase/instances`

**Example (Full Payload):**
```bash
curl -X POST -u krisv:krisv \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "workflowConfig": {
      "name": "EnterpriseOnboardingFlow",
      "version": "1.0",
      "steps": [
        { "id": "start", "type": "START_EVENT", "dependencies": [] },
        {
          "id": "verifyUser",
          "type": "REST",
          "dependencies": ["start"],
          "config": {
            "url": "https://api.example.com/verify",
            "method": "POST",
            "body": "{\"name\": \"${employeeName}\"}"
          }
        },
        { "id": "finish", "type": "END_EVENT", "dependencies": ["verifyUser"] }
      ]
    },
    "inputData": {
      "employeeName": "John Wick",
      "yearsExperience": 20
    }
  }' \
  "http://localhost:8080/kie-server/services/rest/server/containers/zero-flow-deploy/cases/GenericCase/instances"
```

> [!NOTE]
> The response will be a string containing your **Case ID** (e.g., `CASE-0000000012`). All history and auditing for this instance will be visible in the Business Central "Manage Process Instances" UI.

## 🏗 Architecture
For a deep dive into the architecture, JSON schema, and transformation logic, see the **[Solution Document](./solution_doc.md)**.

---
Part of the **Zero-Ops** automation suite.
