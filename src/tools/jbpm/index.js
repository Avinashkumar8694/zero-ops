// src/tools/jbpm/index.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Orchestrator from './Orchestrator.js';
import config from './ConfigManager.js';
import KIEClient from './KIEClient.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * jBPM Tool Entry Point for Zero-Ops CLI.
 * Registers sub-commands for the jBPM Orchestrator.
 */
export default async function (program) {
  // The Zero-Ops CLI already selects the tool name. 
  // We register sub-commands (run/deploy) directly here.
  
  program
    .command('run')
    .description('Run a dynamic JSON workflow')
    .argument('<file>', 'Path to the JSON workflow definition')
    .option('--container <id>', 'KIE Container ID')
    .option('--url <url>', 'KIE Server URL')
    .option('--user <user>', 'KIE Username')
    .option('--pass <pass>', 'KIE Password')
    .action(async (file, options) => {
      try {
        const filePath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
          console.error(`Error: File not found at ${filePath}`);
          process.exit(1);
        }

        const definition = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const resolved = config.getResolvedConfig();
        
        const kieConfig = {
          baseURL: options.url || resolved.url,
          username: options.user || resolved.user,
          password: options.pass || resolved.pass,
          containerId: options.container || resolved.container
        };

        const orchestrator = new Orchestrator(definition, kieConfig);
        const result = await orchestrator.run();

        console.log('\nWorkflow Instance Finished Status:', result.status);
      } catch (err) {
        console.error('Execution Failed:', err.message);
        process.exit(1);
      }
    });

  program
    .command('build')
    .description('Build the Java Generic KJAR using Maven (supports Docker fallback)')
    .action(() => {
      const kjarPath = path.resolve(__dirname, 'java', 'generic-case-kjar');
      console.log(`Building KJAR in ${kjarPath}...`);
      
      try {
        // 1. Try Local Maven
        execSync('mvn -v', { stdio: 'ignore' }); 
        console.log('Using local Maven...');
        execSync('mvn clean install', { cwd: kjarPath, stdio: 'inherit' });
        console.log('\nBuild Successful (Local)!');
      } catch (err) {
        // 2. Fallback to Docker Maven
        console.log('Local Maven not found. Attempting Docker-based build...');
        try {
          execSync('docker -v', { stdio: 'ignore' });
          const dockerCmd = `docker run --rm -v "${kjarPath}":/usr/src/mymaven -w /usr/src/mymaven maven:3.8.6-openjdk-11 mvn clean install`;
          execSync(dockerCmd, { stdio: 'inherit' });
          console.log('\nBuild Successful (Docker)!');
        } catch (dockerErr) {
          console.error('\nBuild Failed! Neither Maven nor Docker were found in your PATH.');
          console.error('Please install Maven or Docker to use the build command.');
          process.exit(1);
        }
      }
    });

  program
    .command('deploy')
    .description('Deploy the Generic KJAR to KIE Server')
    .option('--id <id>', 'Container ID to create')
    .action(async (options) => {
      try {
        const resolved = config.getResolvedConfig();
        const kie = new KIEClient({
          baseURL: resolved.url,
          username: resolved.user,
          password: resolved.pass,
          containerId: options.id || resolved.container
        });

        console.log(`Deploying container [${options.id || resolved.container}] via Universal REST...`);
        
        const kjarPath = path.resolve(__dirname, 'java', 'generic-case-kjar');
        const pomFile = path.join(kjarPath, 'pom.xml');
        
        // Extract version from POM
        const pomContent = fs.readFileSync(pomFile, 'utf8');
        const versionMatch = pomContent.match(/<version>(.*?)<\/version>/);
        const version = versionMatch ? versionMatch[1] : '1.0.0';
        
        const jarFile = path.join(kjarPath, 'target', `generic-case-kjar-${version}.jar`);

        if (!fs.existsSync(jarFile)) {
          throw new Error(`Built JAR not found: ${jarFile}. Please run "build" first.`);
        }

        const jarBuffer = fs.readFileSync(jarFile);
        const pomBuffer = fs.readFileSync(pomFile);

        // 1. Upload POM to Business Central Maven Repo
        console.log('Pushing POM to Maven API...');
        await kie.uploadArtifact("com.zero.jbpm", "generic-case-kjar", version, pomBuffer, true);

        // 2. Upload JAR to Business Central Maven Repo
        console.log('Pushing JAR to Maven API...');
        await kie.uploadArtifact("com.zero.jbpm", "generic-case-kjar", version, jarBuffer, false);

        // 3. Trigger REST Deployment
        console.log('Registering container on KIE Server...');
        await kie.createContainer(options.id || resolved.container, {
          "group-id": "com.zero.jbpm",
          "artifact-id": "generic-case-kjar",
          "version": version
        });

        console.log('Deployment Successful (Universal API Mode)!');
      } catch (err) {
        console.error('Deployment Failed:', err.response?.data || err.message);
        process.exit(1);
      }
    });

  program
    .command('setup')
    .description('Sequence infrastructure, build, and deploy core components')
    .action(async () => {
       console.log('--- Phase 1: Infrastructure Check ---');
       try {
         execSync('node zero-ops.js jbpm infra status', { stdio: 'inherit' });
       } catch (e) {
         console.log('Infrastructure not running. Starting...');
         execSync('node zero-ops.js jbpm infra up', { stdio: 'inherit' });
       }
       
       console.log('\n--- Phase 2: Building Java Assets ---');
       execSync('node zero-ops.js jbpm build', { stdio: 'inherit' });
       console.log('\n--- Phase 3: Deploying to KIE Server ---');
       execSync('node zero-ops.js jbpm deploy', { stdio: 'inherit' });
       console.log('\nSetup Complete. The Generic Interpreter is ready.');
    });

  const infraCmd = program.command('infra').description('Manage local jBPM infrastructure (Docker)');

  infraCmd
    .command('up')
    .description('Start the local jBPM & Jaeger stack')
    .action(() => {
      const dockerPath = path.resolve(__dirname, 'docker');
      console.log('Starting Docker infrastructure...');
      execSync('docker-compose up -d', { cwd: dockerPath, stdio: 'inherit' });
    });

  infraCmd
    .command('down')
    .description('Stop the local jBPM & Jaeger stack')
    .action(() => {
      const dockerPath = path.resolve(__dirname, 'docker');
      console.log('Stopping Docker infrastructure...');
      execSync('docker-compose down', { cwd: dockerPath, stdio: 'inherit' });
    });

  infraCmd
    .command('status')
    .description('Check jBPM stack status')
    .action(() => {
      const dockerPath = path.resolve(__dirname, 'docker');
      execSync('docker-compose ps', { cwd: dockerPath, stdio: 'inherit' });
    });

  const configCmd = program.command('config').description('Manage jBPM credentials and settings');

  configCmd
    .command('set')
    .description('Set configuration values')
    .option('--user <user>', 'KIE Username')
    .option('--pass <pass>', 'KIE Password')
    .option('--url <url>', 'KIE Server URL')
    .option('--container <id>', 'KIE Container ID')
    .action((opts) => {
      config.saveToFile(opts);
    });

  configCmd
    .command('get')
    .description('Get current configuration')
    .action(() => {
      console.log('Current Resolved Config:', config.getResolvedConfig());
    });

  configCmd
    .command('clear')
    .description('Clear local configuration')
    .action(() => {
      config.clear();
    });
}
