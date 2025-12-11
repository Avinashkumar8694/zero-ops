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
   - Send `desktop screenshot` to take a screenshot (the bot will upload the image back to you!).

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
