# Zero-BPM: Native Workflow Orchestration Suite

A high-performance, native Node.js alternative to jBPM. Zero-BPM provides enterprise-grade workflow orchestration, drag-and-drop modeling, and high-fidelity auditing without the overhead of the Java KIE ecosystem.

---

## 🌟 Key Capabilities
*   **Native TypeScript Engine**: 100% stable state-machine execution for dynamic JSON flows.
*   **Visual Studio**: Integrated `bpmn-js` modeler for drag-and-drop project creation.
*   **High-Fidelity Auditing**: Granular tracking of every node transition and variable change in PostgreSQL.
*   **Namespacing**: Organize workflows into logical domains (e.g., `HR`, `IT`, `Finance`).
*   **Hot-Reload Dev Mode**: See changes instantly while modifying source code or JSON definitions.

---

## 🚀 Quick Start (Native Suite)

### 1. Initialize Persistence
Start your local Postgres container and initialize the professional audit schema:
```bash
zero-ops jbpm engine setup
```

### 2. Launch the Visual Studio
Start the dashboard server for modeling and monitoring:
```bash
zero-ops jbpm engine dashboard --port 3000
```
- **Dashboard**: `http://localhost:3000` (Real-time instance monitoring)
- **Modeler**: `http://localhost:3000/modeler` (Drag-and-Drop BPMN Designer)
- **Swagger UI**: `http://localhost:3000/api/docs` (Custom BPM engine + operational APIs)
- **OpenAPI JSON**: `http://localhost:3000/api/docs/openapi.json`

### 3. Native Execution (CLI)
Run a JSON workflow definition natively:
```bash
zero-ops jbpm engine run ./onboarding_sample.json --namespace HR
```

---

## 🛠 Command Reference

### Native Engine (`engine`)
| Command | Description |
| :--- | :--- |
| `setup` | Initialized the PostgreSQL audit schema. |
| `dashboard` | Starts the Express/EJS Management UI. |
| `build` | Compiles TypeScript into production JavaScript. |
| `dev` | **Watch Mode**: Real-time hot-reload for developers. |
| `run <file>` | Primary CLI execution for JSON workflows. |
| `compile <file>` | Translates Dynamic JSON into standard BPMN 2.0 XML. |

## API-First Usage
The custom BPM engine is designed to be consumed by SSD apps, external services, low-code orchestration, and human-task clients through API contracts.

Use the built-in Swagger docs to understand:
- how to trigger a process
- how Start Event input is normalized into `data`, `headers`, `query`, `params`, and `meta`
- how End Event output becomes the final API response
- how to work with human task, signal, deployment, and runtime inspection APIs

### Trigger Model
- `Start Event.inboundMapping` defines request -> process variable mapping
- `Start Event.outboundMapping` defines immediate acknowledgement output
- `End Event.outputMapping` defines the final business response

### Swagger Notes
- `/api/docs` includes both currently implemented operational APIs and the standardized custom-engine contract under `/api/engine/...`
- endpoints under `/api/engine/...` document the target API-first surface for the custom BPM engine
- currently implemented dashboard-backed APIs remain under `/api/...`

### Legacy jBPM (`infra`)
Use these if you need to interface with a standard Java KIE Server:
- `infra up`: Start Docker jBPM stack.
- `build`: Create Java KJAR via Maven.
- `deploy`: Push KJAR to KIE Server.

---

## 🏗 Architecture & Design
For deep-dive technical details on state rehydration, variable scoping, and the "Grand Unification" roadmap, refer to:
- **[Solution Document](./solution_doc.md)**
- **[Full Node Library](./docs/nodes/)**

---
Part of the **Zero-Ops** automation ecosystem.
