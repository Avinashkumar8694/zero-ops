# 📊 Excel Data Comparator (Premium)

The `excel-compare` tool is a high-performance, completely local web application for identifying exact row and cell-level changes between two versions of large `.xlsx, .xls, or .csv` files.

## Architecture

This tool utilizes a hybrid approach:
1. **Node.js Local Server**: A lightweight background server (`index.js`) handles command-line configurations, serves the frontend UI securely, and acts as an API proxy for AI requests (keeping API keys out of the browser memory).
2. **Web Browser Analytics**: The actual heavy lifting (parsing Megabytes of Excel data) is offloaded entirely to your browser using **SheetJS (`xlsx.js`)**. This guarantees your sensitive data never leaves your machine unless you explicitly trigger an AI Summary.

## Quick Start

Launch the interactive UI on port `8378`:
```bash
zero-ops excel-compare
```
Your default browser will automatically open `http://localhost:8378`. 

## AI Generation Setup (Ollama & OpenAI)

The tool includes a special "Executive Summary" button. Instead of sending raw megabytes of data to an LLM, the local diff engine creates a highly compressed "Delta JSON" (containing only the differences).

You can configure the tool to use **OpenAI** (Fast, High Quality) or **Ollama** (100% Private, Free, Local).

### For Local Privacy (Ollama)
If you are analyzing sensitive HR or Financial data, you can point the tool to your local Ollama instance:
```bash
# 1. Set the provider
zero-ops excel-compare config set aiProvider ollama

# 2. Select your local model (default is llama3)
zero-ops excel-compare config set ollamaModel phi3

# 3. (Optional) Set the URL if running on a separate machine
zero-ops excel-compare config set ollamaUrl http://localhost:11434/api/generate
```

### For High Intelligence (OpenAI)
```bash
# 1. Set the provider
zero-ops excel-compare config set aiProvider openai

# 2. Set your secure API key
zero-ops excel-compare config set openAiKey "sk-YOUR_API_KEY_HERE"
```

## Available Config Keys
Manage these via `zero-ops excel-compare config set <key> <value>`.

| Key | Default | Description |
| :--- | :--- | :--- |
| `aiProvider` | `openai` | Determines which backend to query: `openai` or `ollama`. |
| `openAiKey` | `null` | Your OpenAI secret key. |
| `ollamaUrl` | `http://localhost:11434/api/generate` | The endpoint for your local LLM. |
| `ollamaModel` | `llama3` | The targeted local model. |
| `defaultPrimaryKey` | `null` | Automatically sets the text box in the UI so rows are aligned by this column (e.g. `USER_ID`) rather than their row index. |
| `ignoreCase` | `false` | If set to `true`, changes like "Active" vs "active" are ignored. |

## Feature Breakdown

*   **Primary Key Matching**: Rows are aligned by their unique ID, so sorting or deleting a row halfway through the document won't break the comparison for the rest of the sheet.
*   **Action Badges**: Diffs are labeled identically to Git:
    *   🟢 **+ New** (Added Rows/Sheets)
    *   🔴 **- Del** (Deleted Rows/Sheets)
    *   🟠 **~ Mod** (Specific Cells Modified)
*   **Reconcilation Export**: The "Export Report" button generates a new Excel file containing **only the differences**, with explicit `[OLD] -> [NEW]` text markers.
