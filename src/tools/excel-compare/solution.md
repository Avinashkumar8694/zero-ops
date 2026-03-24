# Excel Data Comparator - Premium Tool Solution Design

## Overview
A comprehensive, visually premium tool to compare two Excel files (Base vs. Target). It provides a deep dive into worksheet-level and row/cell-level changes, highlighting additions, deletions, and modifications with a modern, intuitive UI.

## 1. Core Capabilities & Features

### Worksheet-Level Analysis
*   **Sheet Reconciliation**: Clearly identifies sheets that are:
    *   **Added** (exist in Target, not in Base)
    *   **Deleted** (exist in Base, not in Target)
    *   **Modified** (exist in both, but content differs)
    *   **Unchanged** (identical in both)
*   **Structure Validation**: Detects if column headers have changed, been rearranged, added, or removed.

### Row-Level & Cell-Level Analysis
*   **Primary Key Definition**: Users can optionally select one or more columns as the "Primary Key" (e.g., ID, Email) to accurately track rows even if they've been sorted differently. If no primary key is provided, row-by-row index comparison is used.
*   **Detailed Row Status**:
    *   **Added Rows**: New rows in the Target file.
    *   **Deleted Rows**: Rows missing from the Target file.
    *   **Updated Rows**: Rows where the primary key matches, but one or more cell values differ.
*   **Cell-Level Highlight**: For updated rows, explicitly highlight *which* specific cells changed (showing "Old Value" -> "New Value").

### Advanced & Premium Features
*   **Formula vs. Value Detection**: Distinguishes between a cell that contains a hardcoded value vs. a calculated formula. It highlights if a static value was replaced by a formula (or vice versa), and can show the actual formula difference (e.g., `=SUM(A1:A5)` vs `=SUM(A1:A6)`).
*   **Visual/Styling Change Detection**: Flags changes in cell background colors, font weights (bolding), or borders, which is often critical in financial models or heavily formatted reports.
*   **Smart Column Mapping**: If column headers changed names between versions (e.g., "Client ID" -> "Customer ID"), the tool allows users to manually map them so the data is still accurately compared without throwing false positives.

### Interactive Reconciliation & Merge Resolution (New Feature Phase)
A complete visual Git-style merge conflict resolution workflow for Excel data.
*   **Row-Level Acceptance**:
    *   **Accept Deleted Row**: If the Target file deleted a row, you can choose to **"Restore"** it from the Base file.
    *   **Accept/Reject Added Row**: If the Target file added a new row, you can choose to **"Reject"** it, keeping it out of the final merge.
*   **Column & Cell Level Acceptance**:
    *   **Accept Updated Columns**: If a specific column (e.g., "Q3 Revenue") was updated across 50 rows, the UI provides a bulk "Accept Target Column" or "Revert to Base Column" action.
    *   **Granular Cell Reversion**: Click on any amber modified cell `[Old_Value] -> [New_Value]` and specifically toggle whether to keep the Base value or take the Target value.
*   **Merge Review UI**:
    *   The Data Grid will feature interactive checkboxes or toggle switches (Base ↔ Target) on every highlighted row and cell.
    *   A "Resolve All" bulk-action toolbar to instantly accept all Target changes or revert all changes to Base.
    *   Once all conflicts are resolved, clicking **"Export Merged Master"** constructs and writes a flawless `.xlsx` file containing the precise mix of accepted variations.
*   **Macro/VBA Detection**: Alerts the user if the underlying VBA macros or scripts have been modified or removed between the `.xlsm` files.
*   **Duplicate Key Detection**: Analyzes the selected Primary Key and warns the user if duplicates exist in either file, preventing ambiguous comparisons.
*   **Numeric Delta Summaries**: For numerical columns, automatically calculate the total variance (e.g., "Total Revenue changed by +$5,000 across 30 modified rows").
*   **Fuzzy Matching (Optional)**: Identify minor typos or whitespace changes as "warning" modifications rather than hard failures.
*   **Data Type Awareness**: Differentiate between formatting changes (e.g., `10.00` vs `10`) and actual value changes.
*   **Exportable Reports**: Generate a visually rich HTML or PDF report, or export the raw diff data as a new Excel file or JSON.
*   **Large File Support**: Efficient parsing (via streams or Web Workers) to handle large datasets without freezing the browser.

### Enterprise & Pro Capabilities

#### 🤖 Deep Dive: AI-Powered Insights Architecture
The **AI-Powered Insights** feature utilizes an LLM (such as OpenAI's GPT-4o, Anthropic's Claude 3.5, or a local model via Ollama) to interpret the raw diff data and translate it into a human-readable executive summary.

Here is exactly how it will work under the hood:
1.  **Data Sanitization & Preparation (The "Diff Filter")**:
    *   Excel files can be massive, so we cannot send the entire workbook to the LLM.
    *   Once the core JavaScript diff engine runs, it compiles a "Delta JSON" object containing *only* the structural changes and the specific rows/cells that were added, removed, or modified.
    *   *Example Delta*: `{"sheet": "Q3 Budget", "modified_cells": [{"row": "Marketing", "col": "Q3 Spend", "old": "$50,000", "new": "$42,000"}]}`
2.  **Context Assembly & Prompting**:
    *   The tool constructs a highly structured system prompt.
    *   *Prompt logic*: "You are a senior financial analyst. Review the following changes between Version A and Version B of this spreadsheet. Calculate the net difference in key numerical columns. Summarize the top 3 most impactful changes. Output your response in Markdown format."
3.  **Local vs. Cloud Execution (Security First)**:
    *   **Cloud Mode**: The UI will have a settings panel where users can plug in their own OpenAI/Anthropic API key. The sanitized diff (not the whole file) is sent directly from the browser to the API.
    *   **Enterprise/Local Mode**: For highly sensitive financial or HR data, the tool can be configured to point to a local LLM instance (e.g., via `http://localhost:11434/api/generate` for Ollama), ensuring zero data leaves the user's machine.
4.  **UI Integration**:
    *   Once the comparison finishes, a shimmer loading state appears in the "Executive Summary" panel.
    *   The LLM streams the response back token-by-token.
    *   The output provides a high-level narrative (e.g., *"The net budget decreased by $8,000 overall. This is driven by a 16% cut in Marketing Spend, offsetting a slight $1,500 increase in Software Subscriptions."*).

*   **Structural & Metatdata Comparison**: Analyzes changes beyond cells, detecting modifications made to **Data Validation** rules (e.g., dropdown list options changed) or **Conditional Formatting** rules.
*   **Charts & Objects Detection**: Identifies if charts, graphical shapes, or floating images within the Excel sheet were moved, resized, added, or deleted.
*   **Pivot Table Delta**: Specifically analyzes Pivot Table caches to warn if the source data range, selected dimensions, or calculated fields have been altered.
*   **Hidden/Grouped Element Warnings**: Actively alerts users if modifications occurred within rows or columns that are currently hidden or collapsed (which are historically easy to overlook manually).
*   **Audit Trail & Annotation**: Integrates a commenting system. Users can select specific highlighted diffs, add an annotation (e.g., *"Approved change by Finance on 10/12"*), and include these audit notes in the final exported compliance report.
*   **Batch / Folder Comparison**: Allows dragging an entire folder of "V1" files and "V2" files to get a bulk reconciliation report across dozens of workbooks simultaneously.

## 2. User Interface (UI) Design

### Aesthetics
*   **Modern Theme**: Deep dark mode or clean light mode with glassmorphism elements, subtle gradients, and sharp typography (e.g., Inter).
*   **Color Syntax**:
    *   🟩 **Green**: Additions (New sheets, new rows, new columns)
    *   🟥 **Red**: Deletions (Removed sheets, removed rows, removed columns)
    *   🟧 **Amber/Orange**: Modifications (Changed cell values, renamed sheets)

### Layout & Flow
1.  **Dropzone & Configuration Screen**:
    *   Two prominent drag-and-drop zones for `Base File` and `Target File`.
    *   Configuration options: "Select Primary Key Column(s)", "Ignore Whitespace", "Ignore Case".
2.  **Dashboard Overview (Summary)**:
    *   High-level metrics cards: Total Sheets Compared, Total Rows Added, Total Rows Deleted, Total Cells Modified.
    *   Visual "heat map" or progress bar showing the percentage of similarity.
3.  **Detailed Comparison View (Split or Unified)**:
    *   **Sidebar**: List of all sheets with status icons (🟢, 🔴, 🟠, ⚪).
    *   **Main View (Unified Diff)**: A powerful data grid.
        *   Displays data like a standard spreadsheet but with conditional formatting.
        *   Added rows highlighted green.
        *   Modified rows highlighted amber, with the specific changed cells having a split view `[Old Value] | [New Value]` or a hover tooltip showing the previous value.
    *   **Filter Panel**: Toggles to quickly show only "Added", "Deleted", or "Modified" rows to cut through the noise.

## 3. Technical Stack & Implementation

*   **Frontend Technologies**:
    *   **HTML/CSS/JS**: Vanilla JS or a lightweight framework (like Preact/React if allowed, otherwise modern Vanilla JS).
    *   **Styling**: Custom modern CSS (no standard bootstrap/tailwind overrides), CSS Grid/Flexbox for layout, CSS variables for theming.
*   **Excel Parsing Library**:
    *   **`xlsx` (SheetJS)** or **`exceljs`**: Robust libraries for reading and writing `.xlsx`, `.xls`, and `.csv` files entirely in the browser.
*   **Data Processing Engine**:
    *   Web Workers to perform heavy diffing operations asynchronously, keeping the UI thread responsive and animations smooth.
    *   Optimized diffing algorithms (similar to Myers Diff but adapted for structured tabular data and primary keys).

## 4. Work Breakdown

1.  **Phase 1: Foundation & Parsing**: Setup project structure, integrate Excel parsing library, create file upload zones, and extract raw data/metadata from workbooks.
2.  **Phase 2: Diff Engine**: Implement the core comparison logic (identifying added/removed sheets, matching rows via primary keys, cell-level diffing).
3.  **Phase 3: Premium UI Implementation**: Build the dashboard, the sleek data grid diff viewer, sidebars, and filtering controls with top-tier aesthetics.
4.  **Phase 4: Export & Polish**: Add export functionality (HTML report/Excel diff), performance tuning (Web Workers), and final visual polish (micro-animations, tooltips).

---
**Please review these details. Let me know if you would like me to add any other specific features or adjust the flow before I proceed with the implementation!**
