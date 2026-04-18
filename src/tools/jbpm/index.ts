// src/tools/jbpm/index.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import configMod from './ConfigManager.js';
import KIEClient from './KIEClient.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * jBPM Tool Entry Point for Zero-Ops CLI.
 * Aligned with Zero-BPM V3 Native Engine.
 */
export default async function (program: any) {
  
  program
    .command('run')
    .description('Run a dynamic JSON workflow (Native Engine)')
    .argument('<file>', 'Path to the JSON workflow definition')
    .option('--namespace <name>', 'Project namespace', 'default')
    .option('--data <json>', 'Custom input data (JSON string)')
    .action(async (file: string, options: any) => {
      try {
        const filePath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
          console.error(`Error: File not found at ${filePath}`);
          process.exit(1);
        }

        const definition = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (options.data) {
          const customData = JSON.parse(options.data);
          definition.variables = { ...definition.variables, ...customData };
        }

        const Engine = (await import('./Engine.js')).default;
        const engine = new Engine(definition, options.namespace);
        const result = await engine.run();

        console.log('\nWorkflow Execution Status:', result.status);
      } catch (err: any) {
        console.error('Execution Failed:', err.message);
        process.exit(1);
      }
    });

  program
    .command('build')
    .description('Build the Java Generic KJAR using Maven')
    .argument('[name]', 'Optional project name (artifactId)')
    .argument('[version]', 'Optional project version')
    .action((name: string, version: string) => {
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
    .action(async (containerId: string, name: string, version: string) => {
      try {
        const resolved = configMod.getResolvedConfig();
        const kjarPath = path.resolve(__dirname, 'java', 'generic-case-kjar');
        const pomFile = path.join(kjarPath, 'pom.xml');
        const pomContent = fs.readFileSync(pomFile, 'utf8');

        const finalName = name || pomContent.match(/<artifactId>(.*?)<\/artifactId>/)![1];
        const finalVersion = version || pomContent.match(/<version>(.*?)<\/version>/)![1];
        const finalContainerId = containerId || resolved.containerId;

        const kie = new KIEClient({
          baseURL: resolved.baseURL,
          username: resolved.username,
          password: resolved.password,
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
      } catch (err: any) {
        console.error('Deployment Failed:', err.response?.data || err.message);
        process.exit(1);
      }
    });

  program
    .command('list')
    .description('List all execution servers and deployments')
    .action(async () => {
      try {
        const resolved = configMod.getResolvedConfig();
        const kie = new KIEClient({
          baseURL: resolved.baseURL,
          username: resolved.username,
          password: resolved.password,
          containerId: resolved.containerId
        });

        const bcBaseURL = resolved.baseURL.split('/kie-server')[0] + '/business-central/rest/controller';
        
        console.log('\n--- Execution Servers (Controller View) ---');
        const serversResponse = await fetch(`${bcBaseURL}/management/servers`, {
          headers: { 
            'Authorization': `Basic ${Buffer.from(`${resolved.username}:${resolved.password}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        const servers: any = await serversResponse.json();
        
        if (servers?.['server-template']) {
          const templates = Array.isArray(servers['server-template']) ? servers['server-template'] : [servers['server-template']];
          templates.forEach((t: any) => {
            console.log(`\nServer ID: ${t['server-id']} [${t.mode}]`);
            if (t['container-specs']) {
              const specs = Array.isArray(t['container-specs']) ? t['container-specs'] : [t['container-specs']];
              console.log('  Containers:');
              specs.forEach((s: any) => {
                const rid = s['release-id'];
                console.log(`    - ${s['container-id']} (${rid['group-id']}:${rid['artifact-id']}:${rid['version']}) [${s.status}]`);
              });
            }
          });
        }

        console.log('\n--- Runtime Containers (KIE Server View) ---');
        const containers = await kie.getContainers();
        containers.forEach((c: any) => {
          console.log(`- ${c['container-id']} [${c.status}] (Version: ${c['release-id'].version})`);
        });

      } catch (err: any) {
        console.error('Listing Failed:', err.message);
      }
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
    .action((opts: any) => {
      configMod.saveToFile(opts);
    });

  configCmd
    .command('get')
    .description('Get current configuration')
    .action(() => {
      console.log('Current Resolved Config:', configMod.getResolvedConfig());
    });

  configCmd
    .command('clear')
    .description('Clear local configuration')
    .action(() => {
      configMod.clear();
    });

  const engineCmd = program.command('engine').description('Manage native Zero-BPM execution (TypeScript)');

  engineCmd
    .command('run')
    .description('Run workflow natively using the Zero-BPM Engine')
    .argument('<file>', 'JSON flow definition')
    .option('--namespace <name>', 'Project namespace', 'default')
    .action(async (file: string, opts: any) => {
      console.log('Starting Native Zero-BPM Engine...');
      const Engine = (await import('./Engine.js')).default;
      const filePath = path.resolve(process.cwd(), file);
      const definition = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const engine = new Engine(definition, opts.namespace);
      await engine.run();
    });

  engineCmd
    .command('dashboard')
    .description('Start the Zero-BPM monitoring dashboard & modeler')
    .option('--port <number>', 'Port to run on', 3000)
    .option('--seed', 'Run database orchestration and seeding on startup')
    .action(async (opts: any) => {
      const Dashboard = (await import('./Dashboard.js')).default;
      const cMod = (await import('./ConfigManager.js')).default;
      const resolved = cMod.getResolvedConfig();
      
      const server = new Dashboard({
        db: {
          host: 'localhost',
          port: 5433,
          user: resolved.dbUser || 'admin',
          password: resolved.dbPassword || '123456',
          database: resolved.dbName || 'zero'
        }
      });
      await server.init(opts.seed);
      server.start(parseInt(opts.port));
    });

  engineCmd
    .command('compile')
    .description('Compile Dynamic JSON into standard BPMN 2.0 XML')
    .argument('<file>', 'JSON flow definition')
    .action(async (file: string) => {
      const BPMNGenerator = (await import('./BPMNGenerator.js')).default;
      const filePath = path.resolve(process.cwd(), file);
      const definition = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const xml = BPMNGenerator.generate(definition);
      const outPath = filePath.replace('.json', '.bpmn2');
      fs.writeFileSync(outPath, xml);
      console.log(`Compilation successful: ${outPath}`);
    });

  engineCmd
    .command('setup')
    .description('Initialize Zero-BPM Persistence Schema in PostgreSQL')
    .option('--seed', 'Seed the database with standard identity groups and test users')
    .action(async (opts: any) => {
      console.log('--- Zero-BPM: Initializing Database Schema ---');
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      const dockerCmd = `docker exec -i zero-flow-db psql -U admin -d zero < "${schemaPath}"`;
      
      try {
        execSync(dockerCmd, { stdio: 'inherit' });
        console.log('\n[SUCCESS] Zero-BPM Schema initialized.');

        if (opts.seed) {
          console.log('\n--- Zero-BPM: Seeding Secure Identity Model ---');
          const { seedIdentity } = await import('./seed.js');
          const Persistence = (await import('./Persistence.js')).default;
          const cMod = (await import('./ConfigManager.js')).default;
          const resolved = cMod.getResolvedConfig();
          
          const persistence = new Persistence({
            host: 'localhost',
            port: 5433,
            user: resolved.dbUser || 'admin',
            password: resolved.dbPassword || '123456',
            database: resolved.dbName || 'zero'
          });
          
          await seedIdentity(persistence);
          console.log('[SUCCESS] Identity Seeding Complete.');
        } else {
          console.log('\n[TIP] Run "setup --seed" to populate default groups and test users.');
        }
      } catch (err) {
        console.error('\n[ERROR] Initialization failed.');
      }
    });

  engineCmd
    .command('build')
    .description('Build the Zero-BPM TypeScript suite into production JS')
    .action(async () => {
      console.log('--- Zero-BPM: Starting Production Build ---');
      execSync('npm run build:jbpm', { stdio: 'inherit' });
    });

  engineCmd
    .command('dev')
    .description('Start Zero-BPM in Live-Watch mode (Hot-Reload)')
    .action(async () => {
      console.log('--- Zero-BPM: Starting Live-Watch Mode ---');
      execSync('npm run dev:jbpm', { stdio: 'inherit' });
    });

  const enterpriseCmd = program.command('enterprise').description('Manage Enterprise Java jBPM deployment');

  enterpriseCmd
    .command('deploy')
    .description('Transform JSON to Java KJAR, Build, and Deploy to KIE Server')
    .argument('<file>', 'JSON flow definition')
    .option('--container <id>', 'Specific Container ID')
    .action(async (file: string, opts: any) => {
      console.log('--- Zero-BPM: Starting Enterprise Java Deployment ---');
      
      const ProjectGenerator = (await import('./ProjectGenerator.js')).default;
      const KIEClient = (await import('./KIEClient.js')).default;
      const cMod = (await import('./ConfigManager.js')).default;

      const filePath = path.resolve(process.cwd(), file);
      const definition = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      const resolved = cMod.getResolvedConfig();
      const projectName = definition.name.toLowerCase().replace(/\s+/g, '-');

      const generator = new ProjectGenerator();
      const projectPath = await generator.generate(definition);

      console.log('\n[Java] Building KJAR with Maven...');
      try {
        execSync('mvn clean install', { cwd: projectPath, stdio: 'inherit' });
      } catch (e) {
        console.error('\n[ERROR] Maven build failed. Do you have Maven installed?');
        console.log('Falling back to Dockerized build...');
        const dockerCmd = `docker run --rm -v "${projectPath}":/usr/src/mymaven -w /usr/src/mymaven maven:3.8.6-openjdk-11 mvn clean install`;
        execSync(dockerCmd, { stdio: 'inherit' });
      }

      const finalContainerId = opts.container || `${projectName}-${definition.version}`;
      const kie = new KIEClient(resolved);

      console.log(`\n[Java] Deploying [${projectName}:${definition.version}] to container [${finalContainerId}]...`);

      const jarFile = path.join(projectPath, 'target', `${projectName}-${definition.version}.jar`);
      const pomFile = path.join(projectPath, 'pom.xml');

      if (!fs.existsSync(jarFile)) {
        throw new Error(`Built JAR not found at ${jarFile}. Maven build might have failed.`);
      }

      const jarBuffer = fs.readFileSync(jarFile);
      const pomBuffer = fs.readFileSync(pomFile);

      await kie.uploadArtifact("com.zero.jbpm", projectName, definition.version, pomBuffer, true);
      await kie.uploadArtifact("com.zero.jbpm", projectName, definition.version, jarBuffer, false);

      process.stdout.write('Syncing... ');
      await new Promise(r => setTimeout(r, 2000));
      process.stdout.write('Done.\n');

      await kie.createContainer(finalContainerId, {
        "group-id": "com.zero.jbpm",
        "artifact-id": projectName,
        "version": definition.version
      });

      console.log(`\n[SUCCESS] Enterprise Deployment Complete for: ${definition.name}`);
      console.log(`Container ID: ${finalContainerId}`);
    });
}
