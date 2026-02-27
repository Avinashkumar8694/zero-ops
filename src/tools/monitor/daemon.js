/**
 * @file daemon.js
 * @description Background engine for the zero-ops Security Monitor.
 * Runs a persistent auditing loop to detect new suspicious processes and listeners,
 * providing autonomous protection even when the user is away from the terminal.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectReverseShells, getListeners, sendTelegramAlert } from './scanner.js';

const logFile = path.join(os.homedir(), '.zero-ops', 'monitor.log');
const POLL_INTERVAL = 10000; // Continuous scan interval (10 seconds)

/**
 * Appends a timestamped message to the detached monitor log file.
 * 
 * @function log
 * @param {string} msg Log entry content.
 */
function log(msg) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, entry);
}

// Internal state to track previously alerted entities and prevent notification spam.
let seenShells = new Set();
let seenListeners = new Set();

/**
 * Orchestrates a complete security audit cycle.
 * Scans for reverse shells and new public network listeners.
 * 
 * @async
 * @function scan
 */
async function scan() {
    try {
        // --- 1. Reverse Shell Audit ---
        const currentShells = await detectReverseShells();
        currentShells.forEach(s => {
            const id = `${s.pid}-${s.name}`;
            if (!seenShells.has(id)) {
                const msg = `Suspicious Shell Detected!\nProcess: ${s.command} (PID: ${s.pid})\nRemote: ${s.name}`;
                log(`ALERT: ${msg.replace(/\n/g, ' ')}`);
                sendTelegramAlert(msg);
                seenShells.add(id);
            }
        });

        // State cleanup: remove entities that are no longer active
        const currentShellIds = new Set(currentShells.map(s => `${s.pid}-${s.name}`));
        seenShells = new Set([...seenShells].filter(id => currentShellIds.has(id)));

        // --- 2. Public Listener Audit ---
        const currentListeners = await getListeners();
        const publicListeners = currentListeners.filter(l => l.isPublic);

        publicListeners.forEach(l => {
            const id = `${l.pid}-${l.name}`;
            if (!seenListeners.has(id)) {
                const msg = `New Public Listener Found!\nProcess: ${l.command} (PID: ${l.pid})\nPort: ${l.name}`;
                log(`ALERT: ${msg.replace(/\n/g, ' ')}`);
                sendTelegramAlert(msg);
                seenListeners.add(id);
            }
        });

        // State cleanup for listeners
        const currentListenerIds = new Set(publicListeners.map(l => `${l.pid}-${l.name}`));
        seenListeners = new Set([...seenListeners].filter(id => currentListenerIds.has(id)));

    } catch (e) {
        log(`System Scan Fatal Error: ${e.message}`);
    }
}

// --- Lifecycle Initialization ---

log('Security monitor daemon initialized and entering background audit loop.');
scan(); // Immediate first scan on startup
setInterval(scan, POLL_INTERVAL);

/**
 * Handle OS-level termination signals to ensure clean state and log records.
 */
process.on('SIGTERM', () => {
    log('Security monitor daemon received SIGTERM. Synchronous shutdown sequence initiated.');
    process.exit(0);
});

process.on('SIGINT', () => {
    log('Security monitor daemon received SIGINT. Manual termination acknowledged.');
    process.exit(0);
});
