import fs from 'fs';
import path from 'path';

/**
 * SecretResolver handles tiered lookup of sensitive values.
 * Ported to TypeScript for the Zero-BPM Suite.
 */
class SecretResolver {
  private apiSecrets: Record<string, any>;
  private secretsFilePath: string;
  private fileSecrets: Record<string, any>;

  constructor(apiSecrets: Record<string, any> = {}, secretsFilePath: string = 'secret.json') {
    this.apiSecrets = apiSecrets;
    this.secretsFilePath = path.resolve(process.cwd(), secretsFilePath);
    this.fileSecrets = this.loadSecretsFromFile();
  }

  private loadSecretsFromFile(): Record<string, any> {
    try {
      if (fs.existsSync(this.secretsFilePath)) {
        const content = fs.readFileSync(this.secretsFilePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (err: any) {
      console.warn(`Warning: Failed to load secrets from ${this.secretsFilePath}: ${err.message}`);
    }
    return {};
  }

  /**
   * Resolves a secret by key.
   */
  resolve(key: string): any {
    const cleanKey = key.replace(/^SECRET_/, '');

    if (this.apiSecrets[cleanKey] !== undefined) {
      return this.apiSecrets[cleanKey];
    }

    if (this.fileSecrets[cleanKey] !== undefined) {
      return this.fileSecrets[cleanKey];
    }

    return process.env[key] || process.env[cleanKey] || null;
  }
}

export default SecretResolver;
