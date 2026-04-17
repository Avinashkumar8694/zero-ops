import fs from 'fs';
import path from 'path';

/**
 * SecretResolver handles tiered lookup of sensitive values.
 * Priority: 1. In-memory (API) -> 2. secret.json -> 3. Environment Variables (env)
 */
class SecretResolver {
  constructor(apiSecrets = {}, secretsFilePath = 'secret.json') {
    this.apiSecrets = apiSecrets;
    this.secretsFilePath = path.resolve(process.cwd(), secretsFilePath);
    this.fileSecrets = this.loadSecretsFromFile();
  }

  loadSecretsFromFile() {
    try {
      if (fs.existsSync(this.secretsFilePath)) {
        const content = fs.readFileSync(this.secretsFilePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.warn(`Warning: Failed to load secrets from ${this.secretsFilePath}: ${err.message}`);
    }
    return {};
  }

  /**
   * Resolves a secret by key.
   * Format in DSL: ${SECRET_KEY_NAME}
   */
  resolve(key) {
    const cleanKey = key.replace(/^SECRET_/, '');

    // 1. Check API Secrets
    if (this.apiSecrets[cleanKey] !== undefined) {
      return this.apiSecrets[cleanKey];
    }

    // 2. Check secret.json
    if (this.fileSecrets[cleanKey] !== undefined) {
      return this.fileSecrets[cleanKey];
    }

    // 3. Fallback to Environment Variables
    return process.env[key] || process.env[cleanKey] || null;
  }
}

export default SecretResolver;
