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
