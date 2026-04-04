# zero-ops

A Node.js command‑line utility for managing named paths (bigbang flow) and deleting data inside those paths.

## Installation (global)
```bash
npm install -g .   # run in the directory containing package.json
```
This will expose the `zero-ops` command globally.

## Usage

### Getting Help
To see a list of available tools and global options:
```bash
zero-ops --help
```

To see help for a specific tool and its commands:
```bash
zero-ops <tool> --help
```

### Configure a path
```bash
zero-ops <tool> config set <name> <directory> [--active]
```
- `<tool>`: Identifier for the tool (e.g., `bigbang`).
- `<name>`: Identifier for the path configuration.
- `<directory>`: Absolute or relative path to the folder.
- `--active` (optional): Mark the path as active.

### List configurations
```bash
zero-ops <tool> config list
```
Shows all stored configurations for the specified `<tool>`.

### Activate / Deactivate a path
```bash
zero-ops <tool> config activate <name>
zero-ops <tool> config deactivate <name>
```

### Activate / Deactivate all paths
```bash
zero-ops <tool> config activate-all
zero-ops <tool> config deactivate-all
```

### Delete a specific configuration entry
```bash
zero-ops <tool> config delete <name>
```

### Delete data inside a configured path
```bash
zero-ops <tool> delete <name>
```
Deletes all files/folders inside the directory associated with `<name>` for the specified `<tool>`.

### Delete data inside all active paths
```bash
zero-ops <tool> delete-active
```
zero-ops <tool> delete-active
```
Deletes the contents of every path marked as active for the specified `<tool>`.

### Desktop Management
**Note:** Fully supported on macOS. Windows/Linux support is experimental/limited.

```bash
# List running applications
zero-ops desktop list

# Minimize an application
zero-ops desktop minimize "AppName"

# Minimize all applications
zero-ops desktop minimize-all

# Close an application
zero-ops desktop close "AppName"

# Close all applications
zero-ops desktop close-all

# Screenshot
# Captures are saved to ~/.zero-ops/ and copied to clipboard.
zero-ops desktop screenshot          # Full screen
zero-ops desktop screenshot region   # Interactive region selection

# Interactive Window Selection
# On macOS, run the command below, then PRESS SPACE to switch to window selection mode.
zero-ops desktop screenshot window
zero-ops desktop screenshot window
```

### System Security Monitor (`monitor`)
A professional-grade security auditing and network monitoring suite built for `zero-ops`. This tool provides deep visibility into system-level network activity, identifies unauthorized remote access patterns (reverse shells), and offers active response capabilities.

#### **Key Security Features**
- **Deep Cross-Platform Auditing**:
    - **macOS & Linux**: Native integration with `lsof` (list open files) to provide exact process-to-port mapping.
    - **Windows**: Robust support via `netstat -ano` and `tasklist`, providing a unified experience across all environments.
- **Intelligent Reverse Shell Detection**:
    - Monitors for shell binaries (`bash`, `zsh`, `cmd.exe`, `powershell.exe`) and scripting interpreters (`python`, `node`, `ruby`) that have established external connections.
    - Filters out `localhost` (127.0.0.1) and standard development ports to minimize noise.
- **Behavioral Baselining (Anomaly Detection)**:
    - Allows you to capture a "Safe State" of your system. 
    - Subsequent scans automatically highlight **`[NEW]`** connections that were not present in your baseline.
- **Active Threat Response**:
    - Integrated **`kill <PID>`** functionality for immediate termination of unauthorized processes identified during auditing.
- **Detached Daemon Monitoring**:
    - Run the security monitor as a persistent background service. 
    - Automated logging to `~/.zero-ops/monitor.log` and remote Telegram alerting.
- **Remote Telegram Integration**:
    - Receive real-time security alerts on your mobile device. Pairs with the `telegram` tool for autonomous system defense.

#### **Command Reference**

| Command | Description | Security Use Case |
| :--- | :--- | :--- |
| `network` | List all active TCP/UDP sockets | General connectivity audit and baseline check. |
| `reverse-shell` | Focused heuristic threat scan | Detecting persistent remote access or shells. |
| `listeners` | Audit all listening ports | Finding hidden services or exposed public ports. |
| `snapshot` | High-level security summary | Rapid health check to identify anomalies. |
| `baseline` | Capture current system "Safe State" | Establish a norm to detect future intrusions. |
| `inspect <PID>`| Deep process forensics | Analyze PPID, full Command Line Args, and lineage. |
| `kill <PID>` | Immediate process termination | Active response to identified threats. |
| `ignore <proc>` | Whitelist trusted processes | Cleaning up logs by ignoring safe dev tools. |
| `start` | Initialize background daemon | 24/7 autonomous monitoring. |
| `logs` | Tail real-time security events | Monitoring the daemon's auditing loop. |
| `wifi list` | Scan and identify nearby networks | Discover and profile local hardware (OUI). |
| `wifi watch` | Real-time signal dashboard | Monitor fluctuations and RF environment health. |
| `wifi audit` | SSID Clone (Evil Twin) detection | Detect malicious spoofs and signal interference. |
| `wifi diagnostic`| Resolve permission/BSSID issues | Unlock full visibility on macOS (Location Services). |

#### **Technical Deep-Dive**
- **Heuristic Engine**:
    - The `reverse-shell` command specifically analyzes the intersection of process binary names (e.g., `bash`, `python`) and "ESTABLISHED" network sockets that point to external IP addresses.
    - **Note**: Development-related `localhost` traffic is intentionally omitted to prevent false-positives during local debugging.
- **Persistence & Daemon Archetecture**:
    - **PID Tracking**: `~/.zero-ops/monitor.pid`
    - **Audit Logs**: `~/.zero-ops/monitor.log` (Rotated manually or tailed via `monitor logs`).
    - **Polling Interval**: The background daemon polls every 10 seconds, while the `watch` command supports a custom millisecond interval.
- **Configuration Keys**:
    - `telegram.token`: Your Bot API token.
    - `telegram.chat_id`: Your personal Telegram ID for secure alerts.
    - `monitor.baseline`: Encrypted array of "Known Safe" socket signatures.
    - `monitor.ignore`: Process whitelist for noise reduction.

#### **Example Scenarios**
```bash
# Audit for new public interface exposure
zero-ops monitor listeners

# Deep-dive into a suspicious PID to see how it was launched
zero-ops monitor inspect 94398

# Terminate an unauthorized shell connection
zero-ops monitor kill 94398

# Setup a new baseline after installing trusted software
zero-ops monitor baseline
```

> [!TIP]
> Use the [simulationandtestScanner.md](file:///Users/avinashgupta/Documents/ART/testingenv/snippent/src/tools/monitor/simulationandtestScanner.md) guide to verify your setup with controlled, safe security simulations.

### PDF Inspector (`pdf-inspect`)
Advanced PDF inspection and Handlebars (HBS) template generation tool.

```bash
# Start the inspector with a specific PDF file
zero-ops pdf-inspect ~/path/to/your/file.pdf
```

**Features:**
- **Visual Inspection**: Hover over any PDF element (text, image, background box) to see its exact properties, types, and CSS.
- **Content Picker**: Click any element to copy its actual content immediately:
    - **Text**: Copies the raw text string.
    - **Images**: Generates and copies a high-quality Base64 Data URL of the specific image.
    - **Background Blocks**: Copies the hexadecimal color code of detected background sections.
- **HBS Template Generation**:
    - Click **"Download .hbs"** to export a pixel-perfect Handlebars template.
    - **Modular Extraction**: Extracts section backgrounds as individual `div` elements and images as standalone assets.
    - **Line Reconstruction**: Automatically merges fragmented text segments into logical lines, making the template human-readable and easy to tokensize.
    - **1:1 Fidelity**: Maintains exact PDF coordinates and embeds all relevant fonts.

### MockDeck (`mockdeck`)
Mock API studio for `zero-ops` with a browser UI plus operational CLI commands. The UI is rendered with `EJS`, reusable frontend pieces are built with `Lit`, and mock payloads support `Handlebars` templating.

```bash
# Start the local MockDeck UI
zero-ops mockdeck

# List registered APIs
zero-ops mockdeck list

# Add a mock from CLI
zero-ops mockdeck add --name "Users" --method GET --path /api/users --type json --body '{ "users": [] }'

# Delete a single mock
zero-ops mockdeck delete <id>

# Delete all mocks
zero-ops mockdeck clear
```

**Key Features:**
- **UI-first mock registration** for `json`, `text`, `html`, `xml`, `media`, and `proxy` response types.
- **Handlebars templates by default** with request-aware placeholders like `request.query`, `request.params`, and `request.body`.
- **API catalog + cleanup** flows in both UI and CLI.
- **Postman-style trigger panel** to send one-off HTTP requests and inspect status, headers, and bodies.
- **Runner support** for sequential request collections with step-to-step templating.
- **Media asset serving** for images and other binary responses.
- **Proxy support** for forwarding requests to upstream services while keeping local mock control.

### Excel Compare (`excel-compare`)
A Premium data reconciliation tool to intelligently compare large `.xlsx, .xls, and .csv` files. It features a modern Glassmorphism browser interface, client-side SheetJS parsing, and both private and cloud AI integrations for executive summaries.

```bash
# Start the local server and open the browser interface
zero-ops excel-compare
```

**Key Features:**
- **Intelligent Diff Engine**: Compares rows using strict Primary Keys, or automatically dynamically aligns misaligned rows using an advanced **Sliding Window Heuristic** and fuzzy cell similarity when no key is provided.
- **Synchronized Side-by-Side View**: A dual-pane interface with locked horizontal/vertical scrolling to easily visually cross-reference Base (V1) and Target (V2) data.
- **Interactive Merging**: Toggle cell-level or row-level `Accept / Reject` decisions to cherry-pick which data to keep directly from the UI, then export a fully merged V3 master document.
- **Data Privacy**: All heavy parsing and diffing runs securely and locally inside your browser using Web Workers.
- **Enterprise AI Insights**: 
    - Configure to use **OpenAI** or private, local **Ollama** models.
    - Automatically renders Executive Summaries in beautiful Markdown, detailing the exact financial or structural impact of data modifications.
- **Export Ready**: Download actionable `.xlsx` diff sheets strictly highlighting deviations.

**Configuration Setup:**
```bash
# Set up your AI Provider (default is openai)
zero-ops excel-compare config set aiProvider ollama
zero-ops excel-compare config set ollamaModel phi3

# If using OpenAI
zero-ops excel-compare config set openAiKey "sk-your-key-here"

# View current settings
zero-ops excel-compare config get
```
> 📚 **Detailed Documentation**: See the [Full Excel Compare README](./src/tools/excel-compare/README.md) for advanced usage and CLI architecture.

### Telegram Remote Control
Control `zero-ops` from your Telegram app.

1. **Configure Credentials**
   ```bash
   zero-ops telegram config set token "YOUR_BOT_TOKEN"
   zero-ops telegram config set chat_id "YOUR_CHAT_ID"
   ```

2. **Start the Bot in Background**
   ```bash
   zero-ops telegram start
   ```

3. **Check Status**
   ```bash
   zero-ops telegram status
   ```

4. **Stop the Bot**
   ```bash
   zero-ops telegram stop
   ```

5. **Usage**
   - Send `menu` to the bot to immediately bring up a fully interactive **Quick Actions** keyboard (Take Photo, Display Security Snapshot, Minimized Desktop, etc.).
   - Send `desktop screenshot` to take a screenshot (the bot will upload the image back to you!).
   - Send `monitor snapshot` to get a remote security health check.
   - New suspicious connections detected by `monitor watch` or the daemon will be automatically messaged to you!

### Supported Telegram Commands
You can send almost any `zero-ops` command to the bot. Here are the most useful ones:

**Desktop Tool** (`desktop`)
- `desktop list`: Show running applications.
- `desktop minimize "App Name"`: Minimize a specific app.
- `desktop minimize-all`: Minimize everything (Show Desktop).
- `desktop close "App Name"`: Close a specific app.
- `desktop close-all`: Close everything.
- `desktop screenshot`: Take a full-screen screenshot (returns image).
- `desktop screenshot window "App Name"`: Take a screenshot of a specific app window (e.g., `desktop screenshot window "Google Chrome"`).

**BigBang Tool** (`bigbang`)
- `bigbang config list`: View current path configurations.
- `bigbang delete <name>`: Delete data in a named path.
- `bigbang delete-active`: Delete data in all active paths.

**Telegram Tool** (`telegram`)
- `telegram status`: Check bot status remotely.
- `telegram logs`: (Not recommended via chat, use terminal).
- `commands` / `help`: Send this to the **bot** to list all available commands and examples.

**Camera Tool** (`camera`)
- `camera capture [name]`: Take a photo using the webcam.
    - Requires system dependencies (`imagesnap` on macOS, `fswebcam` on Linux).
    - Photos are saved to `~/.zero-ops/camera/` and auto-uploaded to Telegram if requested via bot.

**System Monitor** (`monitor`)
- `monitor snapshot`: Get a remote security health check report.
- `monitor network`: List all active network connections.
- `monitor reverse-shell`: Check for suspicious shell-to-socket correlations.
- `monitor wifi list`: Identify all nearby hardware manufacturers (OUI).
- `monitor wifi audit`: Remotely check for SSID clones/evil twins.
- `monitor start`: Engage background monitoring daemon.
- `monitor stop`: Disengage background monitoring daemon.
- `monitor status`: Check if the monitor is currently heartbeat active.

---

## ⚠️ Important Note & Disclaimer

**Platform Testing**:
This tool has been primarily developed and **verified on macOS**. While Linux and Windows support has been implemented based on standard system tools (`wmctrl`, `PowerShell`, etc.), cross-platform behavior may vary.

**Liability Disclaimer**:
This software is provided "as is", without warranty of any kind, express or implied. By using this software, you agree that you are solely responsible for any consequences resulting from its use. The authors and contributors accept **no responsibility** for any damage, data loss, or system issues that may occur. Please use responsibly.




## Example Workflow
```bash
# Set two paths for 'bigbang' tool, one active
zero-ops bigbang config set projectA ./data/projectA --active
zero-ops bigbang config set projectB ./data/projectB

# List configurations for bigbang
zero-ops bigbang config list

# Delete data for a single path
zero-ops bigbang delete projectA

# Delete data for all active paths under bigbang
zero-ops bigbang delete-active
```

## Development
Install dependencies locally:
```bash
npm install
```
Run the CLI directly (without global install):
```bash
node zero-ops.js <command>
```

## License
MIT
