import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import BPMNGenerator from './BPMNGenerator.js';
import { WorkflowDefinition } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ProjectGenerator transforms a Zero-BPM JSON into a full Java KJAR project.
 */
class ProjectGenerator {
  private templateDir: string;
  private buildBaseDir: string;

  constructor() {
    this.templateDir = path.resolve(__dirname, 'java', 'generic-case-kjar');
    this.buildBaseDir = path.resolve(process.cwd(), 'build', 'kjars');
  }

  /**
   * Generates a new Java Project for the given workflow.
   */
  async generate(definition: WorkflowDefinition): Promise<string> {
    const projectName = definition.name.toLowerCase().replace(/\s+/g, '-');
    const projectDir = path.join(this.buildBaseDir, `${projectName}-${definition.version}`);

    console.log(`[ProjectGenerator] Generating KJAR Project: ${projectName} v${definition.version}`);

    // 1. Create Directories
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    fs.mkdirSync(projectDir, { recursive: true });

    // 2. Copy Template Structure (Simple Copy)
    this.copyRecursive(this.templateDir, projectDir);

    // 3. Inject Generated BPMN
    const bpmnXml = BPMNGenerator.generate(definition);
    const bpmnPath = path.join(projectDir, 'src', 'main', 'resources', 'com', 'zero', 'jbpm', 'generated-flow.bpmn2');
    
    // Ensure nested path exists
    fs.mkdirSync(path.dirname(bpmnPath), { recursive: true });
    fs.writeFileSync(bpmnPath, bpmnXml);

    // 4. Update POM.xml
    const pomPath = path.join(projectDir, 'pom.xml');
    let pomContent = fs.readFileSync(pomPath, 'utf8');
    
    pomContent = pomContent.replace(/<artifactId>.*?<\/artifactId>/, `<artifactId>${projectName}</artifactId>`);
    pomContent = pomContent.replace(/<version>.*?<\/version>/, `<version>${definition.version}</version>`);
    
    fs.writeFileSync(pomPath, pomContent);

    console.log(`[ProjectGenerator] Project generated at: ${projectDir}`);
    return projectDir;
  }

  private copyRecursive(src: string, dest: string) {
    if (path.basename(src) === 'target' || path.basename(src) === '.DS_Store') return;

    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest);
      fs.readdirSync(src).forEach(child => {
        this.copyRecursive(path.join(src, child), path.join(dest, child));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

export default ProjectGenerator;
