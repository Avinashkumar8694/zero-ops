import express, { Request, Response } from 'express';
import session from 'express-session';
import expressLayouts from 'express-ejs-layouts';
import path from 'path';
import { fileURLToPath } from 'url';
import Persistence from './Persistence.js';
import BPMNGenerator from './BPMNGenerator.js';
import { NODE_REGISTRY } from './nodes/registry.js';
import './nodes/index.js'; // Trigger side-effect registrations
import fs from 'fs';

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
                // Force evaluation of the node package
                await import(pathToFileURL(path.join(itemPath, 'index.js')).href);
                
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
    // 0. Global Template Context Hygiene
    this.app.use((req: any, res: Response, next: any) => {
      res.locals.user = req.session?.user || null;
      res.locals.nodeRegistry = NODE_REGISTRY; // Global access for Studio
      res.locals.messages = {}; // Initialize flash/status messages
      next();
    });

    // Auth Middleware: Basic session check
    const checkAuth = (req: any, res: any, next: any) => {
      if (req.session && req.session.user) return next();
      res.redirect('/login');
    };

    // RBAC v2 Middleware: Granular Permission Check
    const requirePermission = (permissionKey: string) => {
      return (req: any, res: any, next: any) => {
        if (!req.session || !req.session.user) return res.redirect('/login');
        
        const perms = req.session.user.permissions || [];
        if (req.session.user.role === 'admin' || perms.includes(permissionKey)) {
          return next();
        }
        
        res.status(403).render('error', { 
          title: 'Access Denied', 
          message: `Your current role/group profile lacks the '${permissionKey}' capability.`,
          layout: 'layout'
        });
      };
    };

    // 1. Auth Flow
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
        res.render('deployments', { title: `Assets: ${projectName}`, assets, project: projectName, user: req.session.user });
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

    // 5. Process Instance Management - Restricted
    this.app.get('/instances', checkAuth, requirePermission('PROCESS_MONITOR'), async (req: Request, res: Response) => {
      try {
        const instances = await this.persistence.getInstances();
        res.render('instances', { title: 'Lifecycle Monitoring', instances, user: req.session.user });
      } catch (err: any) {
        res.status(500).send(err.message);
      }
    });

    // 5.1 Instance Detail View (The "Blue Line" Audit)
    this.app.get('/instances/detail/:id', checkAuth, async (req: Request, res: Response) => {
      const { id } = req.params;
      try {
        const details = await this.persistence.getInstanceDetails(id);
        const logs = await this.persistence.getInstanceNodes(id);
        const variables = await this.persistence.getVariablesSnapshot(id);
        
        res.render('instance_detail', { 
          title: `Inspect Instance`, 
          details, 
          logs, 
          variables, 
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
        const assets = await this.persistence.getDeployments();
        res.render('deployments', { title: 'Global Repository', assets, project: null, user: req.session.user });
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

    this.app.post('/api/instances/:id/abort', checkAuth, requirePermission('PROCESS_ABORT'), async (req: Request, res: Response) => {
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

    // API: Deploy from Modeler (Project-Scoped)
    this.app.post('/api/deploy', checkAuth, async (req: Request, res: Response) => {
      const { name, projectName, xml, json, version } = req.body;
      try {
        await this.persistence.saveAsset(name, projectName, xml, json, version);
        res.json({ success: true, message: 'Release successful' });
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
