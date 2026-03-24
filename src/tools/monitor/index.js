import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { getConnections, detectReverseShells, getListeners, sendTelegramAlert, getProcessDetails, killProcess, saveBaseline, addToIgnore, getWifiStatus, scanWifiNetworks } from './scanner.js';
import { loadConfig } from '../../utils/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Monitor Tool: System Security & Network Auditing
 * 
 * Provides a suite of commands to inspect network interfaces, detect suspicious
 * socket-bound shells, and manage a persistent background security watcher.
 * Compatible with macOS (lsof), Linux (lsof), and Windows (netstat).
 */
export default function (program, toolName) {
    program.description('System security and network connection monitoring suite for auditing unauthorized access.');

    // 1. List all connections
    program
        .command('network')
        .description('Display a comprehensive list of all active network sockets and their associated PIDs.')
        .action(async () => {
            const config = loadConfig();
            const baseline = new Set(config['monitor']?.baseline || []);
            const ignore = config['monitor']?.ignore || [];

            process.stdout.write('\n🔍 Initiating system-wide network socket scan...\n');
            const conns = await getConnections();

            if (conns.length === 0) {
                console.log('No active connections detected. Ensure tool has sufficient system permissions.');
                return;
            }

            console.log('');
            console.log(`${'STATUS'.padEnd(8)} ${'COMMAND'.padEnd(15)} ${'PID'.padEnd(8)} ${'USER'.padEnd(12)} ${'STATE'.padEnd(15)} ${'NAME'}`);
            console.log('-'.repeat(95));

            conns.forEach(c => {
                if (ignore.includes(c.command)) return;

                const isNew = baseline.size > 0 && !baseline.has(c.name);
                const status = isNew ? '\x1b[31m[NEW]\x1b[0m   ' : '        ';
                const color = c.state === 'ESTABLISHED' ? '\x1b[32m' : ''; // Green for established
                const reset = '\x1b[0m';
                console.log(`${status} ${c.command.padEnd(15)} ${c.pid.padEnd(8)} ${c.user.padEnd(12)} ${color}${c.state.padEnd(15)}${reset} ${c.name}`);
            });
            console.log('');
        });

    // 2. Focused Reverse Shell Check
    program
        .command('reverse-shell')
        .description('Security Heuristic: Identify shells or interpreters with active network connections (potential reverse shell indicators).')
        .action(async () => {
            process.stdout.write('\n🛡  Scanning for suspicious shell-to-socket correlations...\n');
            const shells = await detectReverseShells();

            if (shells.length === 0) {
                console.log('✅ \x1b[32mIntelligence check complete: No suspicious shell behaviors detected.\x1b[0m');
            } else {
                console.log('\n⚠️  \x1b[31mCRITICAL SECURITY ALERT: SUSPICIOUS ACTIVITY DETECTED\x1b[0m');
                console.log('The following processes match the signature of a persistent remote access or reverse shell:');
                console.log('-'.repeat(85));
                shells.forEach(s => {
                    console.log(`[!] Binary:  ${s.command}`);
                    console.log(`    PID:     ${s.pid}`);
                    console.log(`    User:    ${s.user}`);
                    console.log(`    Remote:  ${s.name}`);
                    console.log('');
                });
                console.log('\x1b[33mImmediate Action Recommended: Validate these PIDs and network destinations.\x1b[0m\n');
            }
        });

    // 3. Listening Ports
    program
        .command('listeners')
        .description('Audit all processes currently listening for incoming connections, highlighting public interface exposure.')
        .action(async () => {
            const config = loadConfig();
            const baseline = new Set(config['monitor']?.baseline || []);

            process.stdout.write('\n👂 Detecting active network listeners...\n');
            const listeners = await getListeners();

            if (listeners.length === 0) {
                console.log('No listening processes identified.');
            } else {
                console.log('');
                listeners.forEach(l => {
                    const isNew = baseline.size > 0 && !baseline.has(l.name);
                    const status = isNew ? '\x1b[31m[NEW]\x1b[0m   ' : '        ';
                    const exposure = l.isPublic ? '\x1b[31m[⚠️  PUBLIC]\x1b[0m' : '\x1b[34m[🏠 LOCAL]\x1b[0m ';
                    console.log(`${status}${exposure} ${l.command.padEnd(12)} (PID: ${l.pid.padEnd(6)}) listening on ${l.name}`);
                });
                console.log('\x1b[33m\nNote: Public listeners are accessible from any external IP address.\x1b[0m\n');
            }
        });

    // 4. Security Snapshot
    program
        .command('snapshot')
        .description('Generate a high-level security health report summarizing connections, listeners, and suspicious activity.')
        .action(async () => {
            process.stdout.write('\n📊 Compiling System Security Snapshot...\n');
            const [conns, shells, listeners, wifi] = await Promise.all([
                getConnections(),
                detectReverseShells(),
                getListeners(),
                getWifiStatus()
            ]);

            const config = loadConfig();
            const baseline = new Set(config['monitor']?.baseline || []);
            const newConns = conns.filter(c => baseline.size > 0 && !baseline.has(c.name));

            console.log('-'.repeat(45));
            console.log(`\x1b[1m[ Network Guard ]\x1b[0m`);
            console.log(`Total Active Connections: ${conns.length}`);
            console.log(`Anomalous (New) Conns:    ${newConns.length === 0 ? '0' : '\x1b[31m' + newConns.length + '\x1b[0m'}`);
            console.log(`Potential Threat Shells:  ${shells.length === 0 ? '\x1b[32m0 (Clean)\x1b[0m' : '\x1b[31m' + shells.length + ' (Detected!)\x1b[0m'}`);
            console.log(`Total Listening Ports:    ${listeners.length}`);
            console.log(`Publicly Exposed Ports:   ${listeners.filter(l => l.isPublic).length}`);

            console.log(`\n\x1b[1m[ Wireless Guard ]\x1b[0m`);
            if (wifi && wifi.ssid !== 'Disconnected') {
                console.log(`SSID:    ${wifi.ssid}`);
                console.log(`BSSID:   ${wifi.bssid}`);
                console.log(`Signal:  ${wifi.rssi}`);
            } else {
                console.log(`Status:  Disconnected/Disabled`);
            }
            console.log('-'.repeat(45));

            if (shells.length > 0) {
                console.log('\n⚠️  \x1b[31mIMMEDIATE SECURITY ATTENTION REQUIRED:\x1b[0m');
                shells.forEach(s => console.log(`  [!] Unauthorized ${s.command} connection identified to ${s.name}`));
            }
            if (newConns.length > 0) {
                console.log(`\nNote: ${newConns.length} connections detected that are not in your 'baseline'.`);
                console.log(`Run 'zero-ops monitor baseline' to trust the current state.`);
            }
            console.log('');
        });

    // 5. Inspect a PID
    program
        .command('inspect <pid>')
        .description('PRO: Deep-dive into a specific process (PPID, full CMD arguments, lineage).')
        .action(async (pid) => {
            const details = await getProcessDetails(pid);
            if (!details) {
                console.log(`Failed to retrieve details for PID ${pid}. Process may have terminated.`);
                return;
            }
            console.log(`\n🔍 Process Deep-Dive: ${pid}`);
            console.log(`---------------------------------`);
            console.log(`Parent PID:  ${details.ppid}`);
            console.log(`Command:     ${details.command}`);
            console.log(`Arguments:   ${details.args}`);
            console.log(`---------------------------------\n`);
        });

    // 6. Active Response: Kill a PID
    program
        .command('kill <pid>')
        .description('PRO: Immediately terminate a suspicious process.')
        .action(async (pid) => {
            const success = await killProcess(pid);
            if (success) {
                console.log(`✅ Process ${pid} terminated successfully.`);
            } else {
                console.log(`❌ Failed to terminate process ${pid}. Check permissions.`);
            }
        });

    // 7. Behavioral Baselining
    program
        .command('baseline')
        .description('PRO: Capture the current system state as "Safe" to highlight future anomalies.')
        .action(async () => {
            const count = await saveBaseline();
            console.log(`✅ System baseline captured. ${count} connections marked as "Expected".`);
        });

    // 8. Whitelist / Ignore
    program
        .command('ignore <procName>')
        .description('PRO: Add a process name to the ignore list (e.g., node, vscode).')
        .action(async (procName) => {
            addToIgnore(procName);
            console.log(`✅ Added '${procName}' to the security ignore list.`);
        });

    // 9. Watch Mode (Foreground)
    program
        .command('watch')
        .description('Start a foreground security watcher that polls for suspicious activity at a specific interval.')
        .option('-i, --interval <ms>', 'Audit interval in milliseconds', '5000')
        .action(async (options) => {
            const interval = parseInt(options.interval, 10);
            process.stdout.write(`\n👁 Active System Monitoring Engaged... (Loop: ${interval}ms)\n`);
            console.log('Press Ctrl+C to safely disengage the watcher.');

            let seenShells = new Set();

            setInterval(async () => {
                const currentShells = await detectReverseShells();
                currentShells.forEach(s => {
                    const id = `${s.pid}-${s.name}`;
                    if (!seenShells.has(id)) {
                        console.log(`\n\x1b[31m[REAL-TIME ALERT]\x1b[0m unauthorized network shell detection!`);
                        const alertMsg = `Suspicious connection detected!\nProcess: ${s.command} (PID: ${s.pid})\nRemote: ${s.name}`;
                        console.log(alertMsg);
                        sendTelegramAlert(alertMsg);
                        seenShells.add(id);
                    }
                });

                // State management to track active connections
                const currentIds = new Set(currentShells.map(s => `${s.pid}-${s.name}`));
                seenShells = new Set([...seenShells].filter(id => currentIds.has(id)));
            }, interval);
        });

    // --- Daemon Commands ---
    const pidFile = path.join(os.homedir(), '.zero-ops', 'monitor.pid');
    const logFile = path.join(os.homedir(), '.zero-ops', 'monitor.log');

    program
        .command('start')
        .description('Start the security monitor daemon as a background process for persistent protection.')
        .action(() => {
            if (fs.existsSync(pidFile)) {
                const pidStr = fs.readFileSync(pidFile, 'utf8');
                try {
                    process.kill(parseInt(pidStr), 0);
                    console.log(`Security monitor service is already active (PID: ${pidStr})`);
                    return;
                } catch (e) {
                    fs.unlinkSync(pidFile);
                }
            }

            const daemonScript = path.join(__dirname, 'daemon.js');
            const out = fs.openSync(logFile, 'a');
            const err = fs.openSync(logFile, 'a');

            const subprocess = spawn(process.execPath, [daemonScript], {
                detached: true,
                stdio: ['ignore', out, err]
            });

            subprocess.unref();
            fs.writeFileSync(pidFile, subprocess.pid.toString());
            console.log(`✅ Security monitor successfully detached into background (PID: ${subprocess.pid})`);
            console.log(`📜 Persistent Audit Logs: ${logFile}`);
        });

    program
        .command('stop')
        .description('Gracefully terminate the background security monitor service.')
        .action(() => {
            if (!fs.existsSync(pidFile)) {
                console.log('Security monitor service is not currently active.');
                return;
            }
            const pidStr = fs.readFileSync(pidFile, 'utf8');
            try {
                process.kill(parseInt(pidStr));
                console.log(`🛑 Security monitor service terminated (PID: ${pidStr})`);
            } catch (e) {
                console.log(`Failed to signal process ${pidStr}: ${e.message}`);
            } finally {
                if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
            }
        });

    program
        .command('status')
        .description('Check the operational status and PID of the background monitor daemon.')
        .action(() => {
            let status = 'Inactive';
            let pid = 'N/A';

            if (fs.existsSync(pidFile)) {
                const p = fs.readFileSync(pidFile, 'utf8');
                try {
                    process.kill(parseInt(p), 0);
                    status = '\x1b[32mActive\x1b[0m';
                    pid = p;
                } catch (e) {
                    status = '\x1b[33mInactive (Stale PID File)\x1b[0m';
                }
            }

            console.log(`\n🛡  **Security Monitor Service Status**`);
            console.log(`  - State: ${status}`);
            console.log(`  - PID:   ${pid}`);
            console.log(`  - Logs:  ${logFile}\n`);
        });

    program
        .command('logs')
        .description('Follow and display real-time persistent audit logs from the monitor daemon.')
        .action(() => {
            if (!fs.existsSync(logFile)) {
                console.log('No persistent logs found. Has the service been initialized?');
                return;
            }
            const platform = process.platform;
            const cmd = platform === 'win32' ? 'powershell' : 'tail';
            const args = platform === 'win32' ? ['Get-Content', logFile, '-Wait'] : ['-f', logFile];

            console.log(`\n📜 Tailing Security Logs... (${logFile})\n`);
            spawn(cmd, args, { stdio: 'inherit' });
        });

    const wifi = program.command('wifi')
        .description('[PRO] Wireless security suite (Audit, List, Watch, Diagnostic)');

    const getSignalColor = (rssi) => {
        const val = parseInt(rssi);
        if (isNaN(val)) return '\x1b[0m'; // Reset
        if (val >= -55) return '\x1b[32m'; // Green (Strong)
        if (val >= -75) return '\x1b[33m'; // Yellow (Moderate)
        return '\x1b[31m'; // Red (Weak)
    };

    const printWifiTable = (networks, currentStatus) => {
        console.log('-'.repeat(100));
        console.log(`${'SSID'.padEnd(25)} ${'BSSID'.padEnd(20)} ${'Signal'.padEnd(10)} ${'Manufacturer'.padEnd(20)} ${'Status'}`);
        console.log('-'.repeat(100));

        let connectedFlag = false;
        networks.sort((a, b) => {
            const valA = parseInt(a.rssi) || -100;
            const valB = parseInt(b.rssi) || -100;
            return valB - valA;
        }).forEach(n => {
            // macOS BSSID Patching: If BSSID is restricted but matches current SSID, 
            // we patch ONLY the strongest match to prevent mesh-network confusion.
            let displayBssid = n.bssid;
            const isMatch = currentStatus && n.ssid === currentStatus.ssid;

            let isCurrent = false;

            // 1. Precise Match Check & Redaction Detection
            const isRedacted = displayBssid === 'N/A' || displayBssid.includes('redacted') || displayBssid === '00:00:00:00:00:00';
            const statusRedacted = !currentStatus || currentStatus.bssid === 'N/A' || currentStatus.bssid.includes('redacted') || currentStatus.bssid === '00:00:00:00:00:00';

            if (!connectedFlag && !isRedacted && !statusRedacted && displayBssid === currentStatus.bssid) {
                isCurrent = true;
                connectedFlag = true;
            }
            // 2. Fallback: Patching for the active SSID (Strongest match only)
            else if (!connectedFlag && currentStatus && n.ssid === currentStatus.ssid) {
                if (!statusRedacted) displayBssid = currentStatus.bssid;
                isCurrent = true;
                connectedFlag = true;
            }

            const isClone = !isCurrent && currentStatus && n.ssid === currentStatus.ssid &&
                !isRedacted && !statusRedacted &&
                displayBssid !== currentStatus.bssid ? '\x1b[31m[CLONE]\x1b[0m' : '';

            const color = getSignalColor(n.rssi);
            const label = (isCurrent ? '\x1b[32m[CONNECTED]\x1b[0m' : '') || isClone || '';
            const manufacturer = (n.manufacturer || 'Unknown').substring(0, 18);

            process.stdout.write(`${(n.ssid || '<Hidden>').substring(0, 23).padEnd(25)} `);
            process.stdout.write(`${displayBssid.padEnd(20)} `);
            process.stdout.write(`${color}${n.rssi.padEnd(10)}\x1b[0m `);
            process.stdout.write(`${manufacturer.padEnd(20)} `);
            process.stdout.write(`${label}\n`);
        });
        console.log('-'.repeat(100));
    };

    wifi.command('list')
        .description('Discover all nearby Wi-Fi networks with manufacturer identification.')
        .action(async () => {
            process.stdout.write('\n🔍 Scanning for all nearby wireless access points...\n');
            const nearby = await scanWifiNetworks();
            const status = await getWifiStatus();

            if (nearby.length === 0) {
                console.log('No networks found. Ensure Wi-Fi is enabled and permissions are granted.');
                return;
            }

            console.log('\nWireless Environment Map:');
            printWifiTable(nearby, status);

            if (nearby.some(n => n.bssid === 'N/A')) {
                console.log('\n[Tip] BSSIDs are hidden? MacOS requires "Location Services" enabled for Terminal.');
            }
            console.log('');
        });

    wifi.command('watch')
        .description('Live-updating dashboard for wireless signal monitoring.')
        .action(async () => {
            console.log('\n🚀 Starting Live Wireless Guard Dashboard... (Ctrl+C to exit)');

            const run = async () => {
                const status = await getWifiStatus();
                const nearby = await scanWifiNetworks();

                // Clear screen (ANSI escape)
                process.stdout.write('\x1Bc');
                console.log('\x1b[1m🛰  Wireless Security Dashboard (Live)\x1b[0m');
                console.log(`Last Updated: ${new Date().toLocaleTimeString()}`);

                if (status && status.ssid !== 'Disconnected') {
                    const color = getSignalColor(status.rssi);
                    console.log(`\nConnected to: \x1b[32m${status.ssid}\x1b[0m [${status.bssid}]`);
                    console.log(`Signal: ${color}${status.rssi}\x1b[0m | Channel: ${status.channel} | Vendor: ${status.manufacturer}`);
                } else {
                    console.log('\nStatus: \x1b[31mDisconnected\x1b[0m');
                }

                console.log('\nNearby Networks:');
                printWifiTable(nearby, status);
                console.log('\n[Tip] Monitor for [CLONE] tags to identify potential Evil Twin attacks.');
            };

            await run();
            const interval = setInterval(run, 5000);

            process.on('SIGINT', () => {
                clearInterval(interval);
                process.exit();
            });
        });

    wifi.command('diagnostic')
        .description('Run a Wi-Fi diagnostic check to resolve BSSID / Permission issues on macOS.')
        .action(async () => {
            console.log('\n🩺 Running Wireless Diagnostic Suite...\n');
            const status = await getWifiStatus();

            console.log('1. Radio Check:');
            if (status && status.ssid !== 'Disconnected') {
                console.log('   ✅ Wi-Fi Radio is ON and associated.');
            } else {
                console.log('   ❌ Wi-Fi is either OFF or not connected.');
            }

            console.log('\n2. Permission Analysis (macOS):');
            if (status && status.bssid !== 'N/A' && status.bssid !== '00:00:00:00:00:00') {
                console.log('   ✅ Connected BSSID retrieved successfully.');
            } else {
                console.log('   ⚠️  BSSID is being MASKED by the OS.');
                console.log('      Resolution: Enable "Networking & Wireless" in Location Services.');
            }

            console.log('\n3. Location Services Troubleshooting:');
            console.log('   - Step A: Go to System Settings > Privacy & Security > Location Services.');
            console.log('   - Step B: Click "Details..." next to System Services (at the bottom).');
            console.log('   - Step C: Ensure "Networking & Wireless" is toggled ON.');
            console.log('   - Step D: Ensure your Terminal app is allowed to use Location Services.');

            console.log('\n4. Native UI Hint:');
            console.log('   - Hold Option (Alt) and click the Wi-Fi icon in your menu bar.');
            console.log('   - The "BSSID" listed there is what this tool needs to audit.');
            console.log('');
        });

    wifi.command('audit')
        .description('Perform a comprehensive wireless security audit (SSID clones, Signal stability).')
        .action(async () => {
            process.stdout.write('\n📡 Initializing Wireless Guard audit...\n');
            const status = await getWifiStatus();

            if (!status || status.ssid === 'Disconnected') {
                console.log('Wi-Fi is currently disabled or not associated with a network.');
                return;
            }

            console.log('\n--- Current Connection ---');
            console.log(`${'SSID:'.padEnd(12)} ${status.ssid}`);
            console.log(`${'BSSID:'.padEnd(12)} ${status.bssid}`);
            console.log(`${'Signal:'.padEnd(12)} ${status.rssi}`);
            console.log(`${'Channel:'.padEnd(12)} ${status.channel}`);

            process.stdout.write('\n🔍 Scanning for "Evil Twin" clones and nearby interference...\n');
            const nearby = await scanWifiNetworks();

            const duplicates = nearby.filter(n => n.ssid === status.ssid && n.bssid !== status.bssid);

            if (duplicates.length > 0) {
                console.log('\n⚠️  SECURITY WARNING: EVIL TWIN DETECTED');
                console.log(`Multiple access points found sharing the SSID: "${status.ssid}"`);
                duplicates.forEach(d => {
                    console.log(`[!] Alien BSSID: ${d.bssid} (Signal: ${d.rssi})`);
                });
                console.log('\nRemediation: Avoid connecting to this network if the Alien BSSID has a stronger signal than your trusted AP.');
            } else {
                console.log('\n✅ Signal check complete: No SSID clones or active jamming signatures detected in your immediate vicinity.');
            }
            console.log('');
        });


    // Tool Help Text
    program.addHelpText('after', `
Detailed Monitor tool examples:
  Audit current connections:
    $ zero-ops monitor network

  Check for hidden reverse shells:
    $ zero-ops monitor reverse-shell

  Audit publicly exposed ports:
    $ zero-ops monitor listeners

  Run comprehensive security check:
    $ zero-ops monitor snapshot

  Wireless Security (PRO):
    $ zero-ops monitor wifi list       # List nearby SSIDs, BSSIDs, and Manufacturers
    $ zero-ops monitor wifi watch      # Live wireless signal dashboard
    $ zero-ops monitor wifi audit      # Scan for SSIDs and clones
    $ zero-ops monitor wifi diagnostic # Resolve macOS permission issues

  Enable persistent background monitoring:
    $ zero-ops monitor start
    $ zero-ops monitor status
    $ zero-ops monitor logs
    $ zero-ops monitor stop
`);
}

/**
 * Telegram UI Hook: Provides dynamic interactive buttons for parameterless commands.
 */
export async function getTelegramInterceptor(cmdText, executeCommand) {
    if (cmdText === 'monitor kill' || cmdText === 'monitor inspect') {
        const action = cmdText.split(' ')[1];
        
        const networkOutput = await executeCommand('monitor network');
        const pidMatches = [...networkOutput.matchAll(/PID:\s*(\d+)/gi)];
        const pids = [...new Set(pidMatches.map(m => m[1]))].slice(0, 30);
        
        if (pids.length === 0) {
            return { message: `No active network processes found to ${action}.`, buttons: [] };
        }

        const buttons = [];
        for (let i = 0; i < pids.length; i += 3) {
            const row = [];
            for (let j = 0; j < 3; j++) {
                if (i + j < pids.length) {
                    const pid = pids[i + j];
                    const icon = action === 'kill' ? '💀' : '🔍';
                    row.push({ text: `${icon} ${pid}`, callback: `cmd_monitor ${action} ${pid}` });
                }
            }
            buttons.push(row);
        }

        return { message: `Select a process to ${action}:`, buttons };
    }

    if (cmdText === 'monitor ignore') {
        const networkOutput = await executeCommand('monitor network');
        const lines = networkOutput.split('\n');
        
        const procNames = new Set();
        lines.forEach(line => {
            // Match typical line format: [NEW]  node   72932  avi  ESTABLISHED  127.0.0.1:...
            const match = line.match(/^\s*(?:\[NEW\])?\s+([a-zA-Z0-9_-]+)\s+(\d+)\s+/);
            if (match && match[1] && match[1] !== 'COMMAND') {
                procNames.add(match[1]);
            }
        });

        const names = [...procNames].slice(0, 15);
        if (names.length === 0) {
            return { message: `No active network processes found to ignore.`, buttons: [] };
        }

        const buttons = [];
        for (let i = 0; i < names.length; i += 2) {
            const row = [];
            for (let j = 0; j < 2; j++) {
                if (i + j < names.length) {
                    const name = names[i + j];
                    row.push({ text: `🙈 Ignore ${name}`, callback: `cmd_monitor ignore ${name}` });
                }
            }
            buttons.push(row);
        }
        return { message: `Select an active process name to unconditionally ignore in security scans:`, buttons };
    }

    return null;
}

/**
 * Telegram UI Hook: Appends dynamic context buttons to string outputs.
 */
export async function getTelegramPostProcessor(cmdText, outputText) {
    if (!outputText.includes('PID:')) return null;

    const dynamicButtons = [];
    const pidMatches = [...outputText.matchAll(/PID:\s*(\d+)/gi)];
    const pids = [...new Set(pidMatches.map(m => m[1]))].slice(0, 30);
    
    pids.forEach(pid => {
        dynamicButtons.push([
            { text: `🔍 Inspect PID ${pid}`, callback: `cmd_monitor inspect ${pid}` },
            { text: `💀 Kill PID ${pid}`, callback: `cmd_monitor kill ${pid}` }
        ]);
    });

    return { buttons: dynamicButtons };
}
