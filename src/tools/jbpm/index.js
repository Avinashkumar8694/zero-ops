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
    .option('--data <json>', 'Custom input data (JSON string)')
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
        
        // Merge custom input data if provided
        if (options.data) {
          try {
            const customData = JSON.parse(options.data);
            definition.variables = { ...definition.variables, ...customData };
            console.log('Merged custom input variables:', Object.keys(customData));
          } catch (e) {
            console.error('Error parsing --data JSON:', e.message);
            process.exit(1);
          }
        }

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
    .description('Build the Java Generic KJAR using Maven')
    .argument('[name]', 'Optional project name (artifactId)')
    .argument('[version]', 'Optional project version')
    .action((name, version) => {
      const kjarPath = path.resolve(__dirname, 'java', 'generic-case-kjar');
      const pomFile = path.join(kjarPath, 'pom.xml');
      
      if (name || version) {
        console.log(`Updating pom.xml: Name=${name || 'no change'}, Version=${version || 'no change'}...`);
        let pomContent = fs.readFileSync(pomFile, 'utf8');
        if (name) pomContent = pomContent.replace(/<artifactId>.*?<\/artifactId>/, `<artifactId>${name}</artifactId>`);
        if (version) pomContent = pomContent.replace(/<version>.*?<\/version>/, `<version>${version}</version>`);
        fs.writeFileSync(pomFile, pomContent);
      }

      console.log(`Building KJAR in ${kjarPath}...`);
      
      try {
        execSync('mvn -v', { stdio: 'ignore' }); 
        execSync('mvn clean install', { cwd: kjarPath, stdio: 'inherit' });
      } catch (err) {
        console.log('Local Maven failed. Falling back to Docker build...');
        const dockerCmd = `docker run --rm -v "${kjarPath}":/usr/src/mymaven -w /usr/src/mymaven maven:3.8.6-openjdk-11 mvn clean install`;
        execSync(dockerCmd, { stdio: 'inherit' });
      }
    });

  program
    .command('deploy')
    .description('Deploy the Generic KJAR to KIE Server')
    .argument('[containerId]', 'Container ID to create')
    .argument('[name]', 'Project name (artifactId)')
    .argument('[version]', 'Project version')
    .action(async (containerId, name, version) => {
      try {
        const resolved = config.getResolvedConfig();
        const kjarPath = path.resolve(__dirname, 'java', 'generic-case-kjar');
        const pomFile = path.join(kjarPath, 'pom.xml');
        const pomContent = fs.readFileSync(pomFile, 'utf8');

        const finalName = name || pomContent.match(/<artifactId>(.*?)<\/artifactId>/)[1];
        const finalVersion = version || pomContent.match(/<version>(.*?)<\/version>/)[1];
        const finalContainerId = containerId || resolved.container;

        const kie = new KIEClient({
          baseURL: resolved.url,
          username: resolved.user,
          password: resolved.pass,
          containerId: finalContainerId
        });

        console.log(`Deploying [${finalName}:${finalVersion}] to container [${finalContainerId}]...`);
        
        const jarFile = path.join(kjarPath, 'target', `${finalName}-${finalVersion}.jar`);
        if (!fs.existsSync(jarFile)) {
          throw new Error(`Built JAR not found: ${jarFile}. Please run "build" first.`);
        }

        const jarBuffer = fs.readFileSync(jarFile);
        const pomBuffer = fs.readFileSync(pomFile);

        await kie.uploadArtifact("com.zero.jbpm", finalName, finalVersion, pomBuffer, true);
        await kie.uploadArtifact("com.zero.jbpm", finalName, finalVersion, jarBuffer, false);

        await kie.createContainer(finalContainerId, {
          "group-id": "com.zero.jbpm",
          "artifact-id": finalName,
          "version": finalVersion
        });

        console.log('Deployment Successful!');
      } catch (err) {
        console.error('Deployment Failed:', err.response?.data || err.message);
        process.exit(1);
      }
    });

  program
    .command('list')
    .description('List all execution servers and deployments')
    .action(async () => {
      try {
        const resolved = config.getResolvedConfig();
        const kie = new KIEClient({
          baseURL: resolved.url,
          username: resolved.user,
          password: resolved.pass
        });

        const bcBaseURL = resolved.url.split('/kie-server')[0] + '/business-central/rest/controller';
        
        console.log('\n--- Execution Servers (Controller View) ---');
        const serversResponse = await fetch(`${bcBaseURL}/management/servers`, {
          headers: { 
            'Authorization': `Basic ${Buffer.from(`${resolved.user}:${resolved.pass}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        const servers = await serversResponse.json();
        
        if (servers?.['server-template']) {
          const templates = Array.isArray(servers['server-template']) ? servers['server-template'] : [servers['server-template']];
          templates.forEach(t => {
            console.log(`\nServer ID: ${t['server-id']} [${t.mode}]`);
            if (t['container-specs']) {
              const specs = Array.isArray(t['container-specs']) ? t['container-specs'] : [t['container-specs']];
              console.log('  Containers:');
              specs.forEach(s => {
                const rid = s['release-id'];
                console.log(`    - ${s['container-id']} (${rid['group-id']}:${rid['artifact-id']}:${rid['version']}) [${s.status}]`);
              });
            }
          });
        }

        console.log('\n--- Runtime Containers (KIE Server View) ---');
        const containers = await kie.getContainers();
        containers.forEach(c => {
          console.log(`- ${c['container-id']} [${c.status}] (Version: ${c['release-id'].version})`);
        });

      } catch (err) {
        console.error('Listing Failed:', err.message);
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
