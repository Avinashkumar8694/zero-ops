import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { getConnections, detectReverseShells, getListeners, sendTelegramAlert, getProcessDetails, killProcess, saveBaseline, addToIgnore } from './scanner.js';
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
            const config = loadConfig();
            const baseline = new Set(config['monitor']?.baseline || []);

            process.stdout.write('\n📊 Compiling System Security Snapshot...\n');
            const [conns, shells, listeners] = await Promise.all([
                getConnections(),
                detectReverseShells(),
                getListeners()
            ]);

            const newConns = conns.filter(c => baseline.size > 0 && !baseline.has(c.name));

            console.log('-'.repeat(45));
            console.log(`Total Active Connections: ${conns.length}`);
            console.log(`Anomalous (New) Conns:    ${newConns.length === 0 ? '0' : '\x1b[31m' + newConns.length + '\x1b[0m'}`);
            console.log(`Potential Threat Shells:  ${shells.length === 0 ? '\x1b[32m0 (Clean)\x1b[0m' : '\x1b[31m' + shells.length + ' (Detected!)\x1b[0m'}`);
            console.log(`Total Listening Ports:    ${listeners.length}`);
            console.log(`Publicly Exposed Ports:   ${listeners.filter(l => l.isPublic).length}`);
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

  Advanced Utilities (PRO):
    $ zero-ops monitor inspect <PID>    # Deep process inspection
    $ zero-ops monitor kill <PID>       # Active threat termination
    $ zero-ops monitor baseline         # Mark current state as safe
    $ zero-ops monitor ignore <name>    # Whitelist a process

  Enable persistent background monitoring:
    $ zero-ops monitor start
    $ zero-ops monitor status
    $ zero-ops monitor logs
    $ zero-ops monitor stop
`);
}
