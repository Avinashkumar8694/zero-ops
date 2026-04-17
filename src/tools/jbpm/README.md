# jBPM Tool (`jbpm`)

A professional-grade workflow orchestration and process rendering tool for `zero-ops`. This tool allows for dynamic BPMN 2.0 process generation and automated deployment to jBPM KIE Servers using simple JSON configurations.

## 🚀 Key Features
- **Dynamic Process Generation**: Convert JSON DSL directly into jBPM-compatible BPMN 2.0 XML.
- **Automated KJAR Packaging**: Handles the creation of Maven project structures and KJAR bundling.
- **Remote Deployment**: One-click deployment to KIE Server REST endpoints.
- **REST Orchestration**: Native support for configurable REST service tasks.

## 📋 Usage (Proposed)

### Configuration
Set your KIE Server credentials:
```bash
zero-ops jbpm config set serverUrl "http://localhost:8080/kie-server"
zero-ops jbpm config set user "kieserver"
zero-ops jbpm config set password "kieserver1!"
```

### Deployment
Deploy a process from a JSON configuration:
```bash
zero-ops jbpm deploy ./path/to/workflow.json
```

### List Containers
View active deployments on the KIE Server:
```bash
zero-ops jbpm list
```

## 🏗 Architecture
For a deep dive into the architecture, JSON schema, and transformation logic, see the **[Solution Document](./solution_doc.md)**.

## 🛠 Prerequisites
- **jBPM KIE Server**: Running instance (Docker support included).
- **Maven**: Installed and configured in the system PATH.
- **WorkItem Handlers**: Ensure `REST` handler is registered on the server.

---
Part of the **Zero-Ops** automation suite.
