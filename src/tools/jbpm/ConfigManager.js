import fs from 'fs';
import path from 'path';

/**
 * ConfigManager handles persistent tool configuration and auto-discovery.
 * Local settings are stored in .zero-jbpm-config.json
 */
class ConfigManager {
  constructor() {
    this.configPath = path.resolve(process.cwd(), '.zero-jbpm-config.json');
    this.dockerEnvPath = path.resolve(process.cwd(), 'src/tools/jbpm/docker/.env');
  }

  /**
   * Reads settings with priority logic:
   * 1. Local Config File
   * 2. Docker .env Discovery
   * 3. Defaults
   */
  getResolvedConfig() {
    const fileConfig = this.loadFromFile();
    const envDiscovery = this.discoverFromDocker();

    return {
      url: fileConfig.url || envDiscovery.url || 'http://localhost:8080/kie-server/services/rest/server',
      user: fileConfig.user || envDiscovery.user || 'admin',
      pass: fileConfig.pass || envDiscovery.pass || 'admin',
      container: fileConfig.container || 'generic-flow'
    };
  }

  loadFromFile() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {
      console.warn(`Warning: Failed to load config from ${this.configPath}: ${e.message}`);
    }
    return {};
  }

  saveToFile(config) {
    const current = this.loadFromFile();
    const updated = { ...current, ...config };
    fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2));
    console.log(`Config updated at ${this.configPath}`);
  }

  clear() {
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
      console.log('Local config cleared.');
    }
  }

  /**
   * Attempts to parse the Docker .env file for auto-discovery.
   */
  discoverFromDocker() {
    const discovery = {};
    try {
      if (fs.existsSync(this.dockerEnvPath)) {
        const content = fs.readFileSync(this.dockerEnvPath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach(line => {
          if (line.startsWith('KIE_ADMIN_USER=')) {
            discovery.user = line.split('=')[1].trim();
          }
          if (line.startsWith('KIE_ADMIN_PWD=')) {
            discovery.pass = line.split('=')[1].trim();
          }
        });
        
        if (discovery.user) console.log(`[Auto-Discovery] Found credentials in Docker .env for user: ${discovery.user}`);
      }
    } catch (e) {
      // Silent fail for discovery
    }
    return discovery;
  }
}

export default new ConfigManager();
