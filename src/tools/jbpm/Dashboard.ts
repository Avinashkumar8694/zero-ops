import express, { Request, Response } from 'express';
import session from 'express-session';
import expressLayouts from 'express-ejs-layouts';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import Persistence from './Persistence.js';
import BPMNGenerator from './BPMNGenerator.js';
import { NODE_REGISTRY } from './nodes/registry.js';
import './nodes/index.js'; // Trigger side-effect registrations
import fs from 'fs';
import { extractAssetContract, validateNodeConfig } from './nodeContracts.js';
import { buildOpenApiSpec } from './openapi.js';
import EngineRunner from './EngineRunner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Dashboard {
  private app = express();
  private persistence: Persistence;

  constructor(config: any = {}) {
    this.persistence = new Persistence(config.db || {});
  }

  public async init(seed: boolean = false) {
    if (seed) {
      this.persistence.initializeDatabase();
    }

    await this.discoverNodes();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private async discoverNodes() {
    console.log('[Zero-BPM] Initiating Node Discovery v6.5.0 (Stable)...');
    const nodesDir = path.join(__dirname, 'nodes');
    const items = fs.readdirSync(nodesDir);
    
    for (const item of items) {
        const itemPath = path.join(nodesDir, item);
        if (fs.statSync(itemPath).isDirectory()) {
            try {
                // Hybrid Discovery (Supports compiled .js or development-time .ts)
                const possibleIndices = ['index.js', 'index.ts'];
                let discovered = false;
                
                for (const indexFile of possibleIndices) {
                    const indexPath = path.join(itemPath, indexFile);
                    if (fs.existsSync(indexPath)) {
                        await import(pathToFileURL(indexPath).href);
                        discovered = true;
                        break;
                    }
                }
                
                if (!discovered) continue;

                // Unified Documentation Hydration
                const pkg = (globalThis as any).ZERO_BPM_REGISTRY[item];
                if (pkg) {
                    const readmePath = path.join(itemPath, 'README.md');
                    if (fs.existsSync(readmePath)) {
                        pkg.readme = fs.readFileSync(readmePath, 'utf8');
                        console.log(`[Zero-BPM] Node & Docs Calibrated: ${item}`);
                    }
                }
            } catch (e) {
                // Silently skip non-package directories
            }
        }
    }
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Auth & Sessions
    this.app.use(session({
      secret: 'zero-bpm-master-key',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false } // Set to true for HTTPS
    }));

    // Layout Engine
    this.app.use(expressLayouts);
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
    this.app.set('layout', 'layout'); // Set default layout
    
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use('/widgets', express.static(path.join(__dirname, 'widgets')));
    this.app.use('/nodes', express.static(path.join(__dirname, 'nodes')));
  }

  private setupRoutes() {
    const buildDeploymentId = (projectName: string | null | undefined, version: string | null | undefined) =>
      `${String(projectName || 'default')}::${String(version || '1.0.0')}`;

    const parseDeploymentId = (deploymentId: string) => {
      const [projectName, version] = String(deploymentId || '').split('::');
      if (!projectName || !version) {
        throw new Error(`Invalid deploymentId '${deploymentId}'. Expected format '<project>::<version>'.`);
      }
      return { projectName, version };
    };

    const toEngineInstance = (row: any) => ({
      instanceId: row.instance_id,
      workflowName: row.workflow_name,
      deploymentId: buildDeploymentId(row.metadata?.assetProject || row.project_name, row.metadata?.assetVersion),
      namespace: row.namespace,
      status: row.status,
      startTime: row.start_time,
      endTime: row.end_time,
      owner: row.owner,
      metadata: row.metadata || {}
    });

    const toEngineTask = (row: any) => ({
      id: row.id,
      instanceId: row.instance_id,
      nodeId: row.node_id,
      workflowName: row.workflow_name,
      name: row.node_id,
      assignee: row.assignee,
      status: row.status,
      potentialGroups: row.potential_groups || [],
      priority: row.priority,
      formData: row.form_data || {},
      createdAt: row.created_at,
      completedAt: row.completed_at
    });

    const toEngineDeployment = (row: any) => ({
      deploymentId: buildDeploymentId(row.project_name, row.version),
      projectName: row.project_name,
      version: row.version,
      status: row.is_active ? 'ACTIVE' : 'INACTIVE',
      assetCount: Number(row.asset_count || 0),
      processes: row.process_names || [],
      createdAt: row.created_at
    });

    const toVariableSnapshot = (rows: any[]) =>
      rows.reduce((acc: Record<string, any>, row: any) => {
        acc[row.variable_name] = row.variable_value;
        return acc;
      }, {});

    const toVariableRows = (rows: any[], latestSnapshot: Record<string, any> = {}) => {
      if (rows && rows.length > 0) return rows;
      return Object.entries(latestSnapshot || {}).map(([name, value]) => ({
        variable_name: name,
        variable_value: value,
        update_time: new Date().toISOString()
      }));
    };

    const toEngineLogs = (rows: any[]) =>
      rows.map((row: any) => ({
        nodeId: row.node_id,
        nodeName: row.node_name,
        nodeType: row.node_type,
        status: row.status,
        enteredAt: row.enter_time,
        exitedAt: row.exit_time,
        errorDetails: row.error_details
      }));

    // 0. Global Template Context Hygiene
    this.app.use((req: any, res: Response, next: any) => {
      res.locals.user = req.session?.user || req.authUser || null;
      res.locals.nodeRegistry = NODE_REGISTRY; // Global access for Studio
      res.locals.messages = {}; // Initialize flash/status messages
      next();
    });

    const isApiRequest = (req: any) => String(req.path || '').startsWith('/api/');

    const sendUnauthorized = (req: any, res: any) => {
      if (isApiRequest(req)) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Zero-BPM API"');
        return res.status(401).json({
          success: false,
          error: 'Authentication required. Use session cookie or Basic Auth.'
        });
      }
      return res.redirect('/login');
    };

    const sendForbidden = (req: any, res: any, permissionKey: string) => {
      if (isApiRequest(req)) {
        return res.status(403).json({
          success: false,
          error: `Missing required permission '${permissionKey}'.`
        });
      }
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: `Your current role/group profile lacks the '${permissionKey}' capability.`,
        layout: 'layout'
      });
    };

    const authenticateBasicAuth = async (req: any) => {
      const header = String(req.get('authorization') || '');
      if (!header.startsWith('Basic ')) return null;
      try {
        const encoded = header.slice('Basic '.length).trim();
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const separator = decoded.indexOf(':');
        if (separator < 0) return null;
        const username = decoded.slice(0, separator);
        const password = decoded.slice(separator + 1);
        const user = await this.persistence.verifyUser(username, password);
        if (!user) return null;
        const permissions = await this.persistence.getEffectivePermissions(username);
        return { ...user, permissions };
      } catch (err) {
        return null;
      }
    };

    // Auth Middleware: session cookie for console, basic auth for API clients
    const checkAuth = async (req: any, res: any, next: any) => {
      if (req.session && req.session.user) return next();

      const basicUser = await authenticateBasicAuth(req);
      if (basicUser) {
        req.authUser = basicUser;
        return next();
      }

      return sendUnauthorized(req, res);
    };

    // RBAC v2 Middleware: Granular Permission Check
    const requirePermission = (permissionKey: string) => {
      return async (req: any, res: any, next: any) => {
        const activeUser = req.session?.user || req.authUser || null;
        if (!activeUser) {
          const basicUser = await authenticateBasicAuth(req);
          if (basicUser) {
            req.authUser = basicUser;
          }
        }

        const user = req.session?.user || req.authUser || null;
        if (!user) return sendUnauthorized(req, res);

        const perms = user.permissions || [];
        if (user.role === 'admin' || perms.includes(permissionKey)) {
          return next();
        }

        return sendForbidden(req, res, permissionKey);
      };
    };

    // 1. Auth Flow
    this.app.get('/api/docs/openapi.json', checkAuth, (req: Request, res: Response) => {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      res.json(buildOpenApiSpec(baseUrl));
    });

    this.app.get('/api/docs', checkAuth, (req: Request, res: Response) => {
      res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Zero-BPM API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; background: #0f172a; }
      body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .topbar { display: none; }
      .swagger-ui .info, .swagger-ui .scheme-container { background: transparent; box-shadow: none; }
      .swagger-ui .info .title, .swagger-ui, .swagger-ui .info p, .swagger-ui .info li { color: #e2e8f0; }
      .swagger-ui .scheme-container { padding: 16px 20px; border-radius: 16px; background: rgba(15, 23, 42, 0.72); }
      .swagger-ui .opblock-tag { color: #e2e8f0; border-bottom-color: rgba(148, 163, 184, 0.2); }
      .swagger-ui .opblock .opblock-summary-description, .swagger-ui .parameter__name, .swagger-ui .response-col_status, .swagger-ui .response-col_description { color: #cbd5e1; }
      .swagger-ui .opblock-description-wrapper p, .swagger-ui .response-col_links, .swagger-ui .tab li button.tablinks, .swagger-ui section.models h4, .swagger-ui section.models h5 { color: #e2e8f0; }
      #swagger-ui { max-width: 1320px; margin: 0 auto; padding: 24px; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        docExpansion: 'list',
        displayRequestDuration: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        persistAuthorization: true
      });
    </script>
  </body>
</html>`);
    });

    this.app.get('/login', (req: Request, res: Response) => {
      res.render('login', { title: 'Login', layout: false });
    });

    this.app.post('/login', async (req: any, res: Response) => {
      const { username, password } = req.body;
      try {
        const user = await this.persistence.verifyUser(username, password);
        if (user) {
          // Hydrate permissions into session
          const permissions = await this.persistence.getEffectivePermissions(username);
          req.session.user = { ...user, permissions };
          return res.redirect('/');
        }
        res.render('login', { title: 'Login', layout: false, error: 'Invalid credentials' });
      } catch (err: any) {
        res.render('login', { title: 'Login', layout: false, error: 'System error: ' + err.message });
      }
    });

    this.app.get('/logout', (req: any, res: Response) => {
      req.session.destroy(() => res.redirect('/login'));
    });

    // 2. Main Strategy: Project Library is the Entry Point
    this.app.get('/', checkAuth, (req: Request, res: Response) => {
      res.redirect('/projects');
    });

    this.app.get('/projects', checkAuth, async (req: Request, res: Response) => {
      try {
        const projects = await this.persistence.getProjects();
        res.render('projects', { title: 'Process Library', projects, user: req.session.user });
      } catch (err: any) {
        res.status(500).send(err.message);
      }
    });

    // 2.1 Project Asset Listing
    this.app.get('/projects/:name/assets', checkAuth, async (req: Request, res: Response) => {
      const projectName = req.params.name;
      try {
        const assets = await this.persistence.getProjectAssets(projectName);
        const selectedAssetId = req.query.assetId ? parseInt(req.query.assetId as string) : null;
        res.render('assets', {
          title: `Assets: ${projectName}`,
          assets,
          project: projectName,
          selectedAssetId,
          user: req.session.user
        });
      } catch (err: any) {
        res.status(500).send(err.message);
      }
    });

    // 3. Modeler Studio - Contextual to a Project (Supports New & Edit)
    this.app.get('/projects/:projectName/modeler', checkAuth, requirePermission('PROCESS_WRITE'), async (req: Request, res: Response) => {
      const { assetId, newName, newVersion } = req.query;
      let assetDetails = null;
      if (assetId) {
        assetDetails = await this.persistence.getAsset(parseInt(assetId as string));
      }
      
      const projectMetadata = await this.persistence.getProjectMetadata(req.params.projectName);
      const projectAssets = await this.persistence.getProjectAssets(req.params.projectName);
      
      console.log(`[Zero-BPM] Contextualizing Modeler for project: ${req.params.projectName}. Found ${Object.keys((globalThis as any).ZERO_BPM_REGISTRY || {}).length} nodes.`);
      res.render('modeler', { 
        title: assetDetails ? `Editing: ${assetDetails.workflow_name}` : (newName ? `New: ${newName}` : 'Business Studio'), 
        projectName: req.params.projectName,
        asset: assetDetails,
        projectAssets: projectAssets.map(a => a.workflow_name),
        intent: {
          name: newName || (assetDetails ? assetDetails.workflow_name : ''),
          version: newVersion || (assetDetails ? assetDetails.version : (projectMetadata.version || '1.0.0'))
        },
        projectMetadata,
        nodeRegistryContext: Object.fromEntries(
          Object.entries((globalThis as any).ZERO_BPM_REGISTRY || {}).map(([id, pkg]) => {
            const { action, ...sanitized } = pkg as any; // Strip the non-serializable action function
            return [id, sanitized];
          })
        ),
        user: req.session.user 
      });
    });


    // 4. Task Inbox - Accessible to all (Group-Aware)
    this.app.get('/tasks', checkAuth, async (req: Request, res: Response) => {
      const { view } = req.query; // 'personal' (default) or 'global'
      const isGlobal = view === 'global' && (req.session.user.role === 'admin' || req.session.user.role === 'manager');
      
      try {
        let tasks;
        if (isGlobal) {
          // Administrators can see EVERYTHING
          const result = await (this.persistence as any).pool.query(`
            SELECT t.*, i.workflow_name, u.full_name as assignee_name
            FROM zero_tasks t
            JOIN zero_instances i ON t.instance_id = i.instance_id
            LEFT JOIN zero_users u ON t.assignee = u.username
            ORDER BY t.created_at DESC
          `);
          tasks = result.rows;
        } else {
          tasks = await this.persistence.getTasksForUser(req.session.user.username, req.session.user.groups);
        }
        
        res.render('tasks', { title: 'Operational Worklist', tasks, viewType: isGlobal ? 'GLOBAL' : 'PERSONAL', user: req.session.user });
      } catch (err: any) {
        res.status(500).send(err.message);
      }
    });

    // 5. Operational Intelligence - Restricted (Admin/Manager Only)
    this.app.get('/analytics', checkAuth, requirePermission('ANALYTICS_VIEW'), async (req: Request, res: Response) => {
      try {
        const stats = await this.persistence.getSystemAnalytics();
        res.render('analytics', { title: 'Operational Intelligence', stats, user: req.session.user });
      } catch (err: any) {
        res.status(500).send(err.message);
      }
    });

    this.app.get('/pages', checkAuth, (req: Request, res: Response) => {
      res.redirect('/projects');
    });

    this.app.get('/process-definitions', checkAuth, requirePermission('PROCESS_VIEW'), (req: Request, res: Response) => {
      res.redirect('/deployments');
    });

    this.app.get('/jobs', checkAuth, requirePermission('PROCESS_MONITOR'), (req: Request, res: Response) => {
      res.redirect('/instances');
    });

    this.app.get('/execution-errors', checkAuth, requirePermission('PROCESS_MONITOR'), (req: Request, res: Response) => {
      res.redirect('/instances');
    });

    this.app.get('/task-inbox', checkAuth, (req: Request, res: Response) => {
      res.redirect('/tasks');
    });

    this.app.get('/process-reports', checkAuth, requirePermission('ANALYTICS_VIEW'), (req: Request, res: Response) => {
      res.redirect('/analytics');
    });

    this.app.get('/task-reports', checkAuth, requirePermission('ANALYTICS_VIEW'), (req: Request, res: Response) => {
      res.redirect('/analytics');
    });

    // 4.1 Claim Task API
    this.app.post('/api/tasks/claim', checkAuth, async (req: Request, res: Response) => {
      const { taskId } = req.body;
      try {
        await this.persistence.claimTask(parseInt(taskId), req.session.user.username);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.get('/api/engine/deployments', checkAuth, async (req: Request, res: Response) => {
      try {
        const projectName = typeof req.query.projectName === 'string' ? req.query.projectName : undefined;
        const deployments = await this.persistence.listDeploymentUnits(projectName);
        res.json(deployments.map(toEngineDeployment));
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.get('/api/engine/deployments/:deploymentId/processes', checkAuth, async (req: Request, res: Response) => {
      try {
        const { projectName, version } = parseDeploymentId(req.params.deploymentId);
        const assets = await this.persistence.getDeploymentAssets(projectName, version);
        res.json(assets.map((asset: any) => ({
          processName: asset.workflow_name,
          version: asset.version,
          projectName: asset.project_name,
          deploymentId: req.params.deploymentId,
          assetId: asset.id,
          isActive: Boolean(asset.is_active)
        })));
      } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/engine/deployments/:deploymentId/processes/:processName/start', checkAuth, async (req: Request, res: Response) => {
      try {
        const { projectName, version } = parseDeploymentId(req.params.deploymentId);
        const asset = await this.persistence.getAssetByProjectNameAndVersion(projectName, req.params.processName, version);
        if (!asset) {
          return res.status(404).json({
            success: false,
            error: `Process '${req.params.processName}' was not found in deployment '${req.params.deploymentId}'.`
          });
        }

        const triggerContext = {
          data: req.body?.data || {},
          headers: req.body?.headers || {},
          query: req.body?.query || {},
          params: req.body?.params || {},
          meta: req.body?.meta || {}
        };

        const result = await EngineRunner.startAsset(asset, triggerContext, {
          owner: req.session.user.username,
          projectName: asset.project_name || projectName,
          metadata: {
            deploymentId: req.params.deploymentId
          }
        });

        return res.json({
          success: true,
          instanceId: result.state.instanceId,
          status: result.state.metadata?.finalOutput ? 'COMPLETED' : (result.immediateOutput.status || (result.state.nodeStatus && Object.values(result.state.nodeStatus).includes('WAITING' as any) ? 'WAITING' : 'RUNNING')),
          output: result.state.metadata?.finalOutput || result.immediateOutput || {},
          variables: result.state.variables
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/engine/processes/:processName/start', checkAuth, async (req: Request, res: Response) => {
      try {
        const requestedVersion = typeof req.body?.version === 'string' ? req.body.version : null;
        const requestedProject = typeof req.body?.projectName === 'string'
          ? req.body.projectName
          : (typeof req.body?.meta?.projectName === 'string' ? req.body.meta.projectName : null);
        const asset = requestedProject
          ? (requestedVersion
              ? await this.persistence.getAssetByProjectNameAndVersion(requestedProject, req.params.processName, requestedVersion)
              : await this.persistence.getLatestAssetByProjectAndName(requestedProject, req.params.processName))
          : (requestedVersion
              ? await this.persistence.getAssetByNameAndVersion(req.params.processName, requestedVersion)
              : await this.persistence.getLatestAssetByName(req.params.processName));
        if (!asset) {
          return res.status(404).json({ success: false, error: `Process '${req.params.processName}' was not found.` });
        }

        const triggerContext = {
          data: req.body?.data || {},
          headers: req.body?.headers || {},
          query: req.body?.query || {},
          params: req.body?.params || {},
          meta: req.body?.meta || {}
        };

        const result = await EngineRunner.startAsset(asset, triggerContext, {
          owner: req.session.user.username,
          projectName: asset.project_name || requestedProject || null,
          metadata: {
            deploymentId: buildDeploymentId(asset.project_name || requestedProject, asset.version)
          }
        });

        res.json({
          success: true,
          instanceId: result.state.instanceId,
          status: result.state.metadata?.finalOutput ? 'COMPLETED' : (result.immediateOutput.status || (result.state.nodeStatus && Object.values(result.state.nodeStatus).includes('WAITING' as any) ? 'WAITING' : 'RUNNING')),
          output: result.state.metadata?.finalOutput || result.immediateOutput || {},
          variables: result.state.variables
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.get('/api/engine/processes/instances', checkAuth, async (req: Request, res: Response) => {
      try {
        const instances = await this.persistence.getInstances();
        res.json(instances.map(toEngineInstance));
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.get('/api/engine/processes/instances/:instanceId', checkAuth, async (req: Request, res: Response) => {
      try {
        const details = await this.persistence.getInstanceDetails(req.params.instanceId);
        if (!details) return res.status(404).json({ success: false, error: 'Instance not found.' });
        const logs = await this.persistence.getInstanceNodes(req.params.instanceId);
        const variables = await this.persistence.getVariablesSnapshot(req.params.instanceId);
        res.json({
          instance: toEngineInstance(details),
          variables: toVariableSnapshot(toVariableRows(variables, details.variables || {})),
          logs: toEngineLogs(logs),
          design: {
            bpmnXml: details.bpmn_xml,
            jsonConfig: details.json_config || {}
          }
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/engine/processes/instances/:instanceId/abort', checkAuth, requirePermission('PROCESS_OPERATIONS'), async (req: Request, res: Response) => {
      try {
        await this.persistence.abortInstance(req.params.instanceId);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/engine/processes/instances/:instanceId/signals', checkAuth, requirePermission('PROCESS_OPERATIONS'), async (req: Request, res: Response) => {
      try {
        const { signalName, payload = {} } = req.body || {};
        if (!signalName) return res.status(400).json({ success: false, error: 'signalName is required.' });

        const result = await EngineRunner.signalInstance(req.params.instanceId, signalName, payload, {
          owner: req.session.user.username
        });

        res.json({
          success: true,
          waitingNodeId: result.waitingNodeId,
          instanceId: result.state.instanceId,
          status: result.state.metadata?.finalOutput
            ? 'COMPLETED'
            : (result.state.nodeStatus && Object.values(result.state.nodeStatus).includes('WAITING' as any) ? 'WAITING' : 'RUNNING'),
          output: result.state.metadata?.finalOutput || {},
          variables: result.state.variables
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.get('/api/engine/tasks', checkAuth, async (req: Request, res: Response) => {
      try {
        const tasks = await this.persistence.getTasks({
          assignee: typeof req.query.assignee === 'string' ? req.query.assignee : undefined,
          group: typeof req.query.group === 'string' ? req.query.group : undefined,
          status: typeof req.query.status === 'string' ? req.query.status : undefined,
          instanceId: typeof req.query.instanceId === 'string' ? req.query.instanceId : undefined
        });
        res.json(tasks.map(toEngineTask));
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/engine/tasks/:taskId/claim', checkAuth, async (req: Request, res: Response) => {
      try {
        const username = req.body?.username || req.session.user.username;
        await this.persistence.claimTask(parseInt(req.params.taskId), username);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/engine/tasks/:taskId/complete', checkAuth, async (req: Request, res: Response) => {
      try {
        const result = await EngineRunner.completeTask(parseInt(req.params.taskId), req.body?.output || {}, {
          completedBy: req.body?.completedBy || req.session.user.username,
          owner: req.session.user.username
        });
        res.json({
          success: true,
          taskId: parseInt(req.params.taskId),
          instanceId: result.state.instanceId,
          status: result.state.metadata?.finalOutput
            ? 'COMPLETED'
            : (result.state.nodeStatus && Object.values(result.state.nodeStatus).includes('WAITING' as any) ? 'WAITING' : 'RUNNING'),
          output: result.state.metadata?.finalOutput || {},
          variables: result.state.variables
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/engine/tasks/:taskId/reassign', checkAuth, requirePermission('TASK_REASSIGN'), async (req: Request, res: Response) => {
      try {
        await this.persistence.reassignTask(parseInt(req.params.taskId), req.body?.assignee);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // 5. Process Instance Management - Restricted
    this.app.get('/instances', checkAuth, requirePermission('PROCESS_MONITOR'), async (req: Request, res: Response) => {
      try {
        const instances = await this.persistence.getInstances();
        const projects = await this.persistence.getProjects();
        const deployments = await this.persistence.getDeployments();
        const groupedDeployments = projects.map(project => {
          const units = deployments
            .filter(asset => asset.project_name === project.name)
            .reduce((acc: any[], asset) => {
              let unit = acc.find(item => item.workflow_name === asset.workflow_name);
              if (!unit) {
                unit = {
                  workflow_name: asset.workflow_name,
                  project_name: project.name,
                  versions: []
                };
                acc.push(unit);
              }
              unit.versions.push({
                id: asset.id,
                version: asset.version || '1.0.0',
                is_active: asset.is_active,
                created_at: asset.created_at,
                contract: asset.json_config ? extractAssetContract(asset.json_config) : { inputs: [], outputs: [], locals: [] }
              });
              unit.versions.sort((a: any, b: any) => String(b.version).localeCompare(String(a.version), undefined, { numeric: true }));
              return acc;
            }, []);
          return {
            name: project.name,
            namespace: project.namespace,
            units
          };
        });

        res.render('instances', {
          title: 'Process Instances',
          instances,
          projects,
          deployments: groupedDeployments,
          user: req.session.user
        });
      } catch (err: any) {
        res.status(500).send(err.message);
      }
    });

    // 5.1 Instance Detail View (The "Blue Line" Audit)
    this.app.get('/instances/detail/:id', checkAuth, async (req: Request, res: Response) => {
      const { id } = req.params;
      try {
        const details = await this.persistence.getInstanceDetails(id);
        if (!details) {
          return res.status(404).render('error', {
            title: 'Instance Not Found',
            message: `Process instance '${id}' could not be located.`,
            layout: 'layout'
          });
        }
        const logs = await this.persistence.getInstanceNodes(id);
        const variableRows = toVariableRows(await this.persistence.getVariablesSnapshot(id), details.variables || {});
        const tasks = await this.persistence.getTasks({ instanceId: id });
        const family = await this.persistence.getInstanceFamily(id);
        
        res.render('instance_detail', { 
          title: `Inspect Instance`, 
          details, 
          logs, 
          variables: variableRows,
          tasks,
          family,
          user: req.session.user 
        });
      } catch (err: any) {
        res.status(500).send(err.message);
      }
    });

    // 6. Identity & Governance (Unified IAM) - Admin Only
    this.app.get('/users', checkAuth, requirePermission('IAM_ADMIN'), async (req: Request, res: Response) => {
      try {
        await this.persistence.seedAccessControls(); // Ensure orchestration metadata exists
        const users = await this.persistence.getUsers();
        const groups = await this.persistence.getGroups();
        
        // Matrix Data (Integrated into IAM Suite)
        const roles = ['admin', 'developer', 'manager', 'analyst', 'user'];
        const matrixRows = [];
        for (const g of groups) {
          for (const r of roles) {
            matrixRows.push({ group_name: g.group_name, role_name: r });
          }
        }
        const matrix = await this.persistence.getPermissionMatrix();
        const controlResult = await (this.persistence as any).pool.query('SELECT * FROM zero_access_controls ORDER BY category');

        res.render('users', { 
          title: 'Unified Governance Suite', 
          users, 
          groups, 
          rows: matrixRows, 
          controls: controlResult.rows, 
          matrix,
          user: req.session.user 
        });
      } catch (err: any) {
        res.status(500).send(err.message);
      }
    });

    // Remove legacy Matrix route as it is now integrated into /users

    // 7. Global Deployment Repository (Legacy/Unified view)
    this.app.get('/deployments', checkAuth, requirePermission('PROCESS_VIEW'), async (req: Request, res: Response) => {
      try {
        const projects = await this.persistence.getProjects();
        const projectName = (req.query.project as string) || projects[0]?.name || null;
        const assets = projectName
          ? await this.persistence.getProjectAssets(projectName)
          : await this.persistence.getDeployments();
        const selectedWorkflowName = (req.query.workflow as string) || assets[0]?.workflow_name || null;
        const selectedAssetId = req.query.assetId ? parseInt(req.query.assetId as string) : null;
        const selectedAsset = selectedAssetId
          ? assets.find(asset => asset.id === selectedAssetId)
          : assets.find(asset => asset.workflow_name === selectedWorkflowName) || assets[0] || null;
        const versions = selectedAsset && projectName
          ? await this.persistence.getProjectAssetVersions(projectName, selectedAsset.workflow_name)
          : [];
        const contract = selectedAsset && selectedAsset.json_config
          ? extractAssetContract(selectedAsset.json_config)
          : { inputs: [], outputs: [], locals: [] };

        res.render('deployments', {
          title: 'Execution Servers',
          assets,
          project: projectName,
          projects,
          selectedAsset,
          versions,
          contract,
          user: req.session.user
        });
      } catch (err: any) {
        res.status(500).send(err.message);
      }
    });

    // --- Enterprise Project APIs ---

    this.app.post('/api/projects', checkAuth, async (req: any, res: Response) => {
      const { name, namespace, description } = req.body;
      try {
        await this.persistence.createProject(name, namespace, description, req.session.user.username);
        // Decommissioned: Tactical Seeding (V17.0 Sovereignty Patch)
        // await this.persistence.seedProjectDefaults(name);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/projects/:id', checkAuth, requirePermission('PROJECT_CRUD'), async (req: Request, res: Response) => {
      const { name, namespace, description } = req.body;
      try {
        await this.persistence.updateProject(parseInt(req.params.id), name, namespace, description);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.delete('/api/projects/:id', checkAuth, requirePermission('PROJECT_CRUD'), async (req: Request, res: Response) => {
      try {
        await this.persistence.deleteProject(parseInt(req.params.id));
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.get('/api/projects/:name/export', checkAuth, async (req: Request, res: Response) => {
      try {
        const bundle = await this.persistence.exportProject(req.params.name);
        res.json(bundle);
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/projects/import', checkAuth, async (req: Request, res: Response) => {
      try {
        await this.persistence.importProject(req.body);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.get('/api/projects/:name/settings', checkAuth, async (req: Request, res: Response) => {
      try {
        const metadata = await this.persistence.getProjectMetadata(req.params.name);
        res.json({ success: true, metadata });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/projects/:name/settings', checkAuth, requirePermission('PROJECT_CRUD'), async (req: Request, res: Response) => {
      const { metadata } = req.body;
      try {
        await this.persistence.updateProjectMetadata(req.params.name, metadata);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // --- Governance & Management APIs ---

    this.app.post('/api/groups', checkAuth, requirePermission('IAM_ADMIN'), async (req: Request, res: Response) => {
      const { name, description } = req.body;
      try {
        await this.persistence.createGroup(name, description);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/users/groups', checkAuth, requirePermission('IAM_ADMIN'), async (req: Request, res: Response) => {
      const { username, groupName, role, action } = req.body;
      try {
        if (action === 'add') {
          // Update persistence to handle role in group
          await (this.persistence as any).pool.query(
            `INSERT INTO zero_user_groups (username, group_name, role) VALUES ($1, $2, $3) ON CONFLICT (username, group_name) DO UPDATE SET role = $3`,
            [username, groupName, role || 'user']
          );
        } else {
          await this.persistence.removeUserFromGroup(username, groupName);
        }
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/permissions/matrix', checkAuth, requirePermission('IAM_ADMIN'), async (req: Request, res: Response) => {
      const { updates } = req.body;
      try {
        for (const update of updates) {
          await this.persistence.updatePermission(update.group, update.role, update.key, update.state);
        }
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // --- Administrative Control APIs ---

    this.app.post('/api/instances/:id/abort', checkAuth, requirePermission('PROCESS_OPERATIONS'), async (req: Request, res: Response) => {
      try {
        await this.persistence.abortInstance(req.params.id);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/tasks/:id/reassign', checkAuth, requirePermission('TASK_REASSIGN'), async (req: Request, res: Response) => {
      const { assignee } = req.body;
      try {
        await this.persistence.reassignTask(parseInt(req.params.id), assignee);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // API: Project Explorer
    this.app.get('/api/projects/files', checkAuth, async (req: Request, res: Response) => {
      const namespace = (req.query.namespace as string) || 'default';
      try {
        const files = await this.persistence.getNamespaceAssets(namespace);
        res.json({ success: true, files });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // API: Asset Deletion
    this.app.delete('/api/assets/:id', checkAuth, requirePermission('MODELER_EDIT'), async (req: Request, res: Response) => {
      try {
        await this.persistence.deleteAsset(parseInt(req.params.id));
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // API: Asset Rename
    this.app.post('/api/assets/:id/rename', checkAuth, requirePermission('MODELER_EDIT'), async (req: Request, res: Response) => {
      const { newName } = req.body;
      try {
        await this.persistence.renameAsset(parseInt(req.params.id), newName);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/assets/:id/state', checkAuth, requirePermission('PROCESS_OPERATIONS'), async (req: Request, res: Response) => {
      try {
        await this.persistence.setAssetActiveState(parseInt(req.params.id), Boolean(req.body?.isActive));
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // API: Deployment removal is operational only; it must not delete the source asset.
    this.app.post('/api/deployments/:id/remove', checkAuth, requirePermission('PROCESS_OPERATIONS'), async (req: Request, res: Response) => {
      try {
        await this.persistence.setAssetActiveState(parseInt(req.params.id), false);
        res.json({ success: true, removed: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // API: Deploy from Modeler (Project-Scoped)
    this.app.get('/api/assets/contract/:name', checkAuth, async (req: Request, res: Response) => {
      const { name } = req.params;
      try {
        const requestedProject = typeof req.query.projectName === 'string' ? req.query.projectName : null;
        const asset = requestedProject
          ? await this.persistence.getLatestAssetByProjectAndName(requestedProject, name)
          : await this.persistence.getLatestAssetByName(name);
        if (!asset || !asset.json_config) return res.json({ success: true, inputs: [], outputs: [] });

        const contract = extractAssetContract(asset.json_config);
        res.json({ success: true, ...contract });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    this.app.post('/api/deploy', checkAuth, async (req: Request, res: Response) => {
      const { name, projectName, xml, json, version } = req.body;
      try {
        const validationErrors: any[] = [];
        Object.entries(json || {}).forEach(([elementId, config]: [string, any]) => {
          const pkgId = config?.__nodeMeta?.pkgId;
          if (!pkgId || !NODE_REGISTRY[pkgId]) return;
          const issues = validateNodeConfig(NODE_REGISTRY[pkgId], config)
            .filter(issue => issue.level === 'error')
            .map(issue => ({ elementId, pkgId, ...issue }));
          validationErrors.push(...issues);
        });

        if (validationErrors.length > 0) {
          return res.status(400).json({ success: false, error: 'Validation failed', details: validationErrors });
        }

        const savedAsset = await this.persistence.saveAsset(name, projectName, xml, json, version);
        res.json({
          success: true,
          message: 'Release successful',
          assetId: savedAsset?.id || null,
          workflowName: savedAsset?.workflow_name || name,
          version: savedAsset?.version || version,
          projectName: savedAsset?.project_name || projectName
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });
  }

  public start(port: number = 3000) {
    this.app.listen(port, () => {
      console.log(`[Zero-BPM] Dashboard ready at http://localhost:${port}`);
    });
  }
}

export default Dashboard;
