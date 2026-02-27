/**
 * @file scanner.js
 * @description Core system security and network auditing functions for zero-ops.
 * Handles cross-platform network socket retrieval, suspicious process detection,
 * and remote alerting.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import { loadConfig, saveConfig } from '../../utils/index.js';

const execAsync = promisify(exec);
const platform = process.platform;

/**
 * Retrieves a list of active network connections across different Operating Systems.
 * 
 * @async
 * @function getConnections
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of connection objects.
 * Each object contains:
 * - command: The name of the process owning the socket.
 * - pid: The process ID.
 * - user: The system user owning the process.
 * - name: The socket address (Internal -> Remote).
 * - state: The current state of the connection (e.g., ESTABLISHED, LISTEN).
 */
export async function getConnections() {
    if (platform === 'win32') {
        return getConnectionsWindows();
    } else {
        return getConnectionsUnix();
    }
}

/**
 * Internal helper for Unix-based systems (macOS, Linux) using the 'lsof' utility.
 * 
 * @async
 * @function getConnectionsUnix
 * @private
 * @returns {Promise<Array<Object>>}
 */
async function getConnectionsUnix() {
    try {
        const { stdout } = await execAsync('lsof -i -P -n');
        const lines = stdout.split('\n');
        if (lines.length === 0) return [];

        const rows = lines.slice(1).filter(l => l.trim() !== '');

        return rows.map(row => {
            const parts = row.split(/\s+/);
            return {
                command: parts[0] || 'unknown',
                pid: parts[1] || '0',
                user: parts[2] || 'unknown',
                fd: parts[3] || '',
                type: parts[4] || '',
                device: parts[5] || '',
                size: parts[6] || '',
                node: parts[7] || '',
                name: parts[8] || '',
                state: parts[9] ? parts[9].replace(/[()]/g, '') : 'NONE'
            };
        });
    } catch (e) {
        return [];
    }
}

/**
 * Internal helper for Windows systems using 'netstat -ano' and 'tasklist'.
 * Maps PIDs to process names using tasklist output.
 * 
 * @async
 * @function getConnectionsWindows
 * @private
 * @returns {Promise<Array<Object>>}
 */
async function getConnectionsWindows() {
    try {
        const { stdout: netstatOut } = await execAsync('netstat -ano');
        const { stdout: tasklistOut } = await execAsync('tasklist /NH /FO CSV');

        const processMap = {};
        tasklistOut.split('\n').forEach(line => {
            const parts = line.split('","');
            if (parts.length > 1) {
                const name = parts[0].replace(/"/g, '');
                const pid = parts[1].replace(/"/g, '');
                processMap[pid] = name;
            }
        });

        const lines = netstatOut.split('\n');
        return lines.slice(4).filter(l => l.trim() !== '').map(line => {
            const parts = line.trim().split(/\s+/);
            const hasState = parts.length === 5;
            const pid = hasState ? parts[4] : parts[3];
            const state = hasState ? parts[3] : 'NONE';

            return {
                command: processMap[pid] || 'unknown',
                pid: pid,
                user: 'unknown',
                fd: '',
                type: parts[0],
                device: '',
                size: '',
                node: '',
                name: `${parts[1]}->${parts[2]}`,
                state: state === 'LISTENING' ? 'LISTEN' : state
            };
        });
    } catch (e) {
        return [];
    }
}

/**
 * Analyzes active connections using heuristics to detect potential reverse shells.
 * 
 * Heuristics:
 * 1. Process matches known shell binaries (bash, zsh, cmd, etc.) or scripting interpreters.
 * 2. Process has an ESTABLISHED network connection.
 * 3. Connection is not bound to a localhost interface (addressing common dev tool false positives).
 * 
 * @async
 * @function detectReverseShells
 * @returns {Promise<Array<Object>>} Array of connection objects matching suspicious shell signatures.
 */
export async function detectReverseShells() {
    const conns = await getConnections();
    const config = loadConfig();
    const ignore = config['monitor']?.ignore || [];
    const suspiciousCommands = [
        'bash', 'zsh', 'sh', 'python', 'perl', 'ruby', 'node',
        'nc', 'netcat', 'socat', 'php', 'lua', 'cmd.exe', 'powershell.exe'
    ];

    return conns
        .filter(c => !ignore.includes(c.command))
        .filter(c => {
            const cmdLower = c.command.toLowerCase();
            const isSuspiciousProc = suspiciousCommands.some(s => cmdLower.includes(s));
            const isEstablished = c.state === 'ESTABLISHED';
            const isLocalhost = c.name.includes('127.0.0.1') || c.name.includes('localhost') || c.name.includes('::1');

            // SIMULATION MODE: Allow localhost for verification
            return isSuspiciousProc && isEstablished && !isLocalhost;
        });
}

/**
 * Dispatches an automated security alert to a configured Telegram bot.
 * 
 * @async
 * @function sendTelegramAlert
 * @param {string} message The plain text message to send as an alert.
 * @returns {Promise<boolean>} Resolves to true if the alert was successfully dispatched.
 */
export async function sendTelegramAlert(message) {
    const config = loadConfig();
    const telegram = config['telegram'];

    // Silently skip if Telegram is not configured
    if (!telegram || !telegram.token || !telegram.chat_id) {
        return false;
    }

    const { token, chat_id } = telegram;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const data = JSON.stringify({
        chat_id: chat_id,
        text: `🚨 [zero-ops Security Alert]\n\n${message}`,
        parse_mode: 'HTML'
    });

    return new Promise((resolve) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
    });
}

/**
 * Retrieves granular details for a specific PID, including lineage and command-line arguments.
 * 
 * @async
 * @function getProcessDetails
 * @param {number|string} pid The process ID to inspect.
 * @returns {Promise<Object|null>} Details including ppid, command, and args.
 */
export async function getProcessDetails(pid) {
    if (platform === 'win32') {
        try {
            const cmd = `powershell -Command "Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' | Select-Object ParentProcessId, CommandLine | ConvertTo-Json"`;
            const { stdout } = await execAsync(cmd);
            const data = JSON.parse(stdout);
            return {
                pid: pid,
                ppid: data.ParentProcessId,
                command: '', // Usually part of CommandLine
                args: data.CommandLine
            };
        } catch (e) { return null; }
    } else {
        try {
            // -o ppid,command,args
            const { stdout } = await execAsync(`ps -p ${pid} -o ppid,command,args`);
            const lines = stdout.trim().split('\n');
            if (lines.length < 2) return null;
            const parts = lines[1].trim().split(/\s+/);
            const ppid = parts[0];
            const command = parts[1];
            const args = lines[1].trim().substring(lines[1].trim().indexOf(parts[2] || ''));
            return {
                pid: pid,
                ppid: ppid,
                command: command,
                args: args
            };
        } catch (e) { return null; }
    }
}

/**
 * Attempts to terminate a process by PID.
 * 
 * @async
 * @function killProcess
 * @param {number|string} pid The PID to terminate.
 * @returns {Promise<boolean>}
 */
export async function killProcess(pid) {
    const cmd = platform === 'win32'
        ? `taskkill /F /PID ${pid}`
        : `kill -9 ${pid}`;
    try {
        await execAsync(cmd);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Baselining Logic: Store the current "safe" state.
 */
export async function saveBaseline() {
    const conns = await getConnections();
    const config = loadConfig();
    const monitor = config['monitor'] || {};

    // Hash connections by CID (Local:Remote)
    monitor.baseline = conns.map(c => c.name);
    config['monitor'] = monitor;
    saveConfig(config);
    return conns.length;
}

/**
 * Ignore List Logic.
 */
export function addToIgnore(procName) {
    const config = loadConfig();
    const monitor = config['monitor'] || {};
    const ignore = new Set(monitor.ignore || []);
    ignore.add(procName);
    monitor.ignore = Array.from(ignore);
    config['monitor'] = monitor;
    saveConfig(config);
}

/**
 * Returns all listening ports, highlighting those open to 0.0.0.0 (public).
 * Filters out items in the ignore list.
 * 
 * @async
 * @function getListeners
 * @returns {Promise<Array<Object>>} Array of listener objects with an 'isPublic' flag.
 */
export async function getListeners() {
    const conns = await getConnections();
    const config = loadConfig();
    const ignore = config['monitor']?.ignore || [];

    return conns
        .filter(c => c.state === 'LISTEN')
        .filter(c => !ignore.includes(c.command))
        .map(c => ({
            ...c,
            isPublic: c.name.startsWith('*') || c.name.includes('0.0.0.0') || c.name.includes('[::]')
        }));
}
