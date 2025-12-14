// src/utils/index.js
// Export utility functions for zero-cli as ES module
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(os.homedir(), '.zero-ops-config.json');

export function loadConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
}

export function saveConfig(cfg) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

export function deleteDirectoryContents(dirPath) {
    if (!fs.existsSync(dirPath)) {
        console.warn(`Path does not exist: ${dirPath}`);
        return;
    }
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
        const full = path.join(dirPath, entry);
        try {
            const stat = fs.lstatSync(full);
            if (stat.isDirectory()) {
                fs.rmSync(full, { recursive: true, force: true });
            } else {
                fs.unlinkSync(full);
            }
        } catch (err) {
            console.error(`Failed to remove ${full}: ${err.message}`);
        }
    }
    console.log(`All data inside ${dirPath} has been deleted.`);
}
