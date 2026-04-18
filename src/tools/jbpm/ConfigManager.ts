import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KIEConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(process.cwd(), '.zero-jbpm-config.json');

/**
 * Manages jBPM/KIE credentials and local environment settings.
 */
class ConfigManager {
  /**
   * Loads config from file or environment.
   */
  getResolvedConfig(): KIEConfig {
    let fileConfig: any = {};
    if (fs.existsSync(CONFIG_FILE)) {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }

    return {
      baseURL: process.env.KIE_SERVER_URL || fileConfig.url || 'http://localhost:8080/kie-server/services/rest/server',
      username: process.env.KIE_USER || fileConfig.user || 'admin',
      password: process.env.KIE_PASSWORD || fileConfig.pass || 'admin123',
      containerId: process.env.KIE_CONTAINER || fileConfig.container || 'generic-case-kjar_1.0.0'
    };
  }

  /**
   * Persists settings to a local JSON file.
   */
  saveToFile(updates: any) {
    const current = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : {};
    const updated = { ...current, ...updates };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    console.log(`[Zero-BPM] Configuration saved to ${CONFIG_FILE}`);
  }

  /**
   * Removes the local configuration file.
   */
  clear() {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
      console.log(`[Zero-BPM] Configuration cleared.`);
    }
  }
}

export default new ConfigManager();
