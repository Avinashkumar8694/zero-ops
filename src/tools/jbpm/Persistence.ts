import pg from 'pg';
import bcrypt from 'bcryptjs';
import { PersistenceConfig, WorkflowNode } from './types.js';

/**
 * Persistence manages the Zero-BPM database layer for auditing and state tracking.
 * Ported to TypeScript for rigorous type safety.
 */
class Persistence {
  private pool: pg.Pool;

  constructor(config: PersistenceConfig) {
    this.pool = new pg.Pool({
      user: config.user || 'admin',
      host: config.host || 'localhost',
      database: config.database || 'zero',
      password: config.password || '123456',
      port: config.port || 5433,
    });
  }

  /**
   * Idempotent Database Orchestration (Self-Healing Migrations)
   */
  async initializeDatabase(): Promise<void> {
    try {
      console.log('[Zero-BPM] Initiating comprehensive schema orchestration...');
      
      // 1. Identity & Governance (New Tables)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS zero_access_controls (
          permission_key VARCHAR(100) PRIMARY KEY,
          category VARCHAR(50),
          description TEXT
        )
      `);
      
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS zero_role_permissions (
          id SERIAL PRIMARY KEY,
          group_name VARCHAR(100) REFERENCES zero_groups(group_name),
          role_name VARCHAR(50),
          permission_key VARCHAR(100) REFERENCES zero_access_controls(permission_key),
          is_enabled BOOLEAN DEFAULT TRUE,
          UNIQUE(group_name, role_name, permission_key)
        )
      `);

      // 2. Structural Hardening (Missing Columns in Existing Tables)
      
      // zero_user_groups updates
      await this.pool.query(`ALTER TABLE zero_user_groups ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'USER'`);

      // zero_projects updates
      await this.pool.query(`ALTER TABLE zero_projects ADD COLUMN IF NOT EXISTS description TEXT`);
      await this.pool.query(`ALTER TABLE zero_projects ADD COLUMN IF NOT EXISTS namespace VARCHAR(100) DEFAULT 'default'`);
      await this.pool.query(`ALTER TABLE zero_projects ADD COLUMN IF NOT EXISTS owner VARCHAR(100) REFERENCES zero_users(username)`);
      await this.pool.query(`ALTER TABLE zero_projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`);
      // Ensure unique constraint only on project name (allow multiple projects per namespace)
      await this.pool.query(`ALTER TABLE zero_projects DROP CONSTRAINT IF EXISTS zero_projects_namespace_key`);
      await this.pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS zero_projects_name_key ON zero_projects(name)`);

      // zero_instances updates
      await this.pool.query(`ALTER TABLE zero_instances ADD COLUMN IF NOT EXISTS namespace VARCHAR(100) DEFAULT 'default'`);
      await this.pool.query(`ALTER TABLE zero_instances ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'`);
      await this.pool.query(`ALTER TABLE zero_instances ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`);
      await this.pool.query(`ALTER TABLE zero_instances ADD COLUMN IF NOT EXISTS owner VARCHAR(100) REFERENCES zero_users(username)`);

      // zero_assets updates
      await this.pool.query(`ALTER TABLE zero_assets ADD COLUMN IF NOT EXISTS project_name VARCHAR(255) REFERENCES zero_projects(name)`);
      await this.pool.query(`ALTER TABLE zero_assets ADD COLUMN IF NOT EXISTS namespace VARCHAR(100) DEFAULT 'default'`);
      await this.pool.query(`ALTER TABLE zero_assets ADD COLUMN IF NOT EXISTS version VARCHAR(50)`);

      // zero_tasks updates (CRITICAL FIX)
      await this.pool.query(`ALTER TABLE zero_tasks ADD COLUMN IF NOT EXISTS potential_groups JSONB DEFAULT '[]'`);
      await this.pool.query(`ALTER TABLE zero_tasks ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1`);
      await this.pool.query(`ALTER TABLE zero_tasks ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'`);
      await this.pool.query(`ALTER TABLE zero_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);

      // 3. Automated Seeding
      await this.seedAccessControls();
      await this.seedOrganizationalUnits();
      
      // 4. Tactical Project Seeding (Ensures library isn't empty)
      const projectCount = (await this.pool.query('SELECT COUNT(*) FROM zero_projects')).rows[0].count;
      if (parseInt(projectCount) === 0) {
        console.log('[Zero-BPM] Seeding initial enterprise container: Project-One');
        await this.createProject('Project-One', 'DEFAULT', 'Initial enterprise orchestration container provisioned during system setup.', 'admin');
        await this.seedProjectDefaults('Project-One');
      }

      console.log('[Zero-BPM] Database orchestrated and calibrated to V6 standards.');
    } catch (err: any) {
      console.error('[Zero-BPM] Orchestration failed:', err.message);
    }
  }

  /**
   * Seeding Logic: Organizational Context
   */
  async seedOrganizationalUnits(): Promise<void> {
    const defaultGroups = [
      ['HR', 'Human Resources and Personnel Management'],
      ['IT', 'Infrastructure and Technology Operations'],
      ['FINANCE', 'Financial Orchestration and Audit'],
      ['MANAGERS', 'Organizational Governance and Strategy']
    ];
    for (const [name, desc] of defaultGroups) {
      await this.createGroup(name, desc);
    }
  }

  /**
   * Project & Space Management
   */
  async getProjects(): Promise<any[]> {
    const query = `SELECT * FROM zero_projects ORDER BY created_at DESC`;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async createProject(name: string, namespace: string, description: string = '', owner: string = 'admin'): Promise<void> {
    const query = `
      INSERT INTO zero_projects (name, namespace, description, owner)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name) DO UPDATE SET description = $3
    `;
    await this.pool.query(query, [name, namespace, description, owner]);
  }

  async updateProject(id: number, name: string, namespace: string, description: string): Promise<void> {
    const query = `
      UPDATE zero_projects 
      SET name = $2, namespace = $3, description = $4 
      WHERE id = $1
    `;
    await this.pool.query(query, [id, name, namespace, description]);
  }

  async deleteProject(id: number): Promise<void> {
    // 1. Get project name first for cascaded asset cleanup if needed
    const project = (await this.pool.query(`SELECT name FROM zero_projects WHERE id = $1`, [id])).rows[0];
    if (!project) return;

    // 2. Transactional Delete (Assets first, then project)
    await this.pool.query('BEGIN');
    try {
      await this.pool.query(`DELETE FROM zero_assets WHERE project_name = $1`, [project.name]);
      await this.pool.query(`DELETE FROM zero_projects WHERE id = $1`, [id]);
      await this.pool.query('COMMIT');
    } catch (e) {
      await this.pool.query('ROLLBACK');
      throw e;
    }
  }

  async getProjectMetadata(name: string): Promise<any> {
    const query = `SELECT metadata FROM zero_projects WHERE name = $1`;
    const result = await this.pool.query(query, [name]);
    return result.rows[0]?.metadata || {};
  }

  async updateProjectMetadata(name: string, metadata: any): Promise<void> {
    const query = `UPDATE zero_projects SET metadata = $1 WHERE name = $2`;
    await this.pool.query(query, [JSON.stringify(metadata), name]);
  }

  /**
   * Initializes the process instance record.
   */
  async createInstance(instanceId: string, workflowName: string, namespace: string, variables: Record<string, any> = {}, owner: string = 'admin'): Promise<void> {
    const query = `
      INSERT INTO zero_instances (instance_id, workflow_name, namespace, variables, owner)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (instance_id) DO UPDATE SET workflow_name = $2
    `;
    await this.pool.query(query, [instanceId, workflowName, namespace, JSON.stringify(variables), owner]);
  }

  /**
   * Logs a node lifecycle event (The "Blue Line" Audit).
   */
  async logNode(instanceId: string, node: Partial<WorkflowNode>, status: string, errorDetails: string | null = null): Promise<void> {
    const query = `
      INSERT INTO zero_nodes (instance_id, node_id, node_name, node_type, status, error_details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await this.pool.query(query, [
      instanceId, 
      node.id, 
      node.name || node.id, 
      node.type || 'UNKNOWN', 
      status, 
      errorDetails
    ]);
  }

  /**
   * Records a versioned variable change.
   */
  async logVariable(instanceId: string, name: string, value: any): Promise<void> {
    const query = `
      INSERT INTO zero_variables (instance_id, variable_name, variable_value)
      VALUES ($1, $2, $3)
    `;
    await this.pool.query(query, [instanceId, name, JSON.stringify(value)]);
  }

  /**
   * Syncs the latest variables back to the instance snapshot.
   */
  async updateInstanceVariables(instanceId: string, variables: Record<string, any>): Promise<void> {
    const query = `UPDATE zero_instances SET variables = $1 WHERE instance_id = $2`;
    await this.pool.query(query, [JSON.stringify(variables), instanceId]);
  }

  /**
   * Finalizes an instance.
   */
  async completeInstance(instanceId: string, status: string = 'COMPLETED'): Promise<void> {
    const query = `UPDATE zero_instances SET status = $1, end_time = CURRENT_TIMESTAMP WHERE instance_id = $2`;
    await this.pool.query(query, [status, instanceId]);
  }

  /**
   * Administrative Control: Abort Instance
   */
  async abortInstance(instanceId: string): Promise<void> {
    await this.completeInstance(instanceId, 'ABORTED');
    // Also mark all ready/reserved tasks as ABORTED
    await this.pool.query(`UPDATE zero_tasks SET status = 'ABORTED' WHERE instance_id = $1 AND status IN ('READY', 'RESERVED', 'IN_PROGRESS')`, [instanceId]);
  }

  /**
   * Stores a generated BPMN asset with project context.
   */
  async saveAsset(workflowName: string, projectName: string, bpmnXml: string, jsonConfig: any, version: string = '1.0.0'): Promise<void> {
    const query = `
      INSERT INTO zero_assets (workflow_name, project_name, bpmn_xml, json_config, version)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (workflow_name, version) DO UPDATE SET bpmn_xml = $3, json_config = $4
    `;
    await this.pool.query(query, [workflowName, projectName, bpmnXml, JSON.stringify(jsonConfig), version]);
  }

  /**
   * Lists all assets within a specific project.
   */
  async getProjectAssets(projectName: string): Promise<any[]> {
    const query = `SELECT * FROM zero_assets WHERE project_name = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(query, [projectName]);
    return result.rows;
  }

  async getAsset(id: number): Promise<any> {
    const result = await this.pool.query(`SELECT * FROM zero_assets WHERE id = $1`, [id]);
    return result.rows[0];
  }

  async deleteAsset(id: number): Promise<void> {
    await this.pool.query(`DELETE FROM zero_assets WHERE id = $1`, [id]);
  }

  async renameAsset(id: number, newName: string): Promise<void> {
    await this.pool.query(`UPDATE zero_assets SET workflow_name = $1 WHERE id = $2`, [newName, id]);
  }

  /**
   * Bundles a project for export (Portable JSON structure).
   */
  async exportProject(projectName: string): Promise<any> {
    const projectQuery = `SELECT * FROM zero_projects WHERE name = $1`;
    const assetQuery = `SELECT * FROM zero_assets WHERE project_name = $1`;
    
    const project = (await this.pool.query(projectQuery, [projectName])).rows[0];
    const assets = (await this.pool.query(assetQuery, [projectName])).rows;
    
    return {
      metadata: project,
      assets: assets,
      exported_at: new Date().toISOString()
    };
  }

  /**
   * Restores a project from an export bundle.
   */
  async importProject(bundle: any): Promise<void> {
    const { metadata, assets } = bundle;
    
    // 1. Restore Project metadata
    await this.createProject(metadata.name, metadata.namespace, metadata.description, metadata.owner);
    
    // 2. Restore Assets
    for (const asset of assets) {
      await this.saveAsset(asset.workflow_name, metadata.name, asset.bpmn_xml, asset.json_config, asset.version);
    }
  }

  /**
   * Tactical Seeding: Provisions new projects with high-fidelity examples.
   */
  async seedProjectDefaults(projectName: string): Promise<void> {
    const examples = [
      {
        name: 'Enterprise-Approval-Flow',
        version: '1.0.0',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://bpmn.io/schema/bpmn" id="Definitions_1">
  <bpmn:process id="Approval_Process" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Initiate Request">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UserTask_1" name="Manager Review">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="ServiceTask_1" name="Audit Log">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:endEvent id="EndEvent_1" name="Request Finalized">
      <bpmn:incoming>Flow_3</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="ServiceTask_1" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="ServiceTask_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Approval_Process">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_1_di" bpmnElement="UserTask_1">
        <dc:Bounds x="240" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ServiceTask_1_di" bpmnElement="ServiceTask_1">
        <dc:Bounds x="400" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="562" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="400" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="500" y="120" />
        <di:waypoint x="562" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
        config: { 
          UserTask_1: { assignee: 'manager', candidate_groups: '["FINANCE"]', description: 'Review the high-fidelity request' },
          ServiceTask_1: { connector_id: 'rest', endpoint: 'http://localhost:3000/api/audit', method: 'POST', body: '{"event": "APPROVAL_PROCESSED"}' }
        }
      },
      {
        name: 'External-API-Connector',
        version: '1.0.0',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://bpmn.io/schema/bpmn" id="Definitions_Connector">
  <bpmn:process id="Connector_Process" isExecutable="true">
    <bpmn:startEvent id="StartEvent_2" name="External Trigger" />
    <bpmn:serviceTask id="ServiceTask_2" name="REST Invocation" />
    <bpmn:endEvent id="EndEvent_2" name="Sync Complete" />
    <bpmn:sequenceFlow id="Flow_X" sourceRef="StartEvent_2" targetRef="ServiceTask_2" />
    <bpmn:sequenceFlow id="Flow_Y" sourceRef="ServiceTask_2" targetRef="EndEvent_2" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Connector">
    <bpmndi:BPMNPlane id="BPMNPlane_Connector" bpmnElement="Connector_Process">
      <bpmndi:BPMNShape id="StartEvent_2_di" bpmnElement="StartEvent_2">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ServiceTask_2_di" bpmnElement="ServiceTask_2">
        <dc:Bounds x="280" y="138" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_2_di" bpmnElement="EndEvent_2">
        <dc:Bounds x="440" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_X_di" bpmnElement="Flow_X">
        <di:waypoint x="216" y="178" />
        <di:waypoint x="280" y="178" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Y_di" bpmnElement="Flow_Y">
        <di:waypoint x="380" y="178" />
        <di:waypoint x="440" y="178" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
        config: {
          ServiceTask_2: { connector_id: 'rest', endpoint: 'https://api.external.com/v1/sync', method: 'GET', output_map: '{"status": "$.response.code"}' }
        }
      }
    ];

    for (const ex of examples) {
      await this.saveAsset(ex.name, projectName, ex.xml, ex.config, ex.version);
    }
  }

  /**
   * Retrieves an asset (definition) by name.
   */

  /**
   * Operational Intelligence: Aggregates system metrics
   */
  async getSystemAnalytics(): Promise<any> {
    const statsResult = await this.pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM zero_instances WHERE status = 'RUNNING') as active_instances,
        (SELECT COUNT(*) FROM zero_instances WHERE status = 'COMPLETED') as completed_instances,
        (SELECT COUNT(*) FROM zero_instances WHERE status = 'ABORTED' OR status = 'ERROR') as failed_instances,
        (SELECT COUNT(*) FROM zero_tasks WHERE status = 'READY' OR status = 'RESERVED') as pending_tasks,
        (SELECT COUNT(*) FROM zero_projects) as total_projects
    `);
    
    const distributionResult = await this.pool.query(`
      SELECT status, COUNT(*) as count 
      FROM zero_instances 
      GROUP BY status
    `);

    const activityTimeline = await this.pool.query(`
      SELECT DATE(start_time) as date, COUNT(*) as count 
      FROM zero_instances 
      WHERE start_time > CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(start_time)
      ORDER BY date ASC
    `);

    return {
      overview: statsResult.rows[0],
      distribution: distributionResult.rows,
      timeline: activityTimeline.rows
    };
  }

  /**
   * Lists all active deployments for the Repository view.
   */
  async getDeployments(): Promise<any[]> {
    const query = `SELECT * FROM zero_assets ORDER BY created_at DESC`;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Lists all process instances.
   */
  async getInstances(): Promise<any[]> {
    const query = `SELECT * FROM zero_instances ORDER BY start_time DESC`;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Fetches detailed instance metadata, linking with the original asset XML.
   */
  async getInstanceDetails(instanceId: string): Promise<any> {
    const query = `
      SELECT i.*, a.bpmn_xml, a.json_config 
      FROM zero_instances i
      LEFT JOIN zero_assets a ON i.workflow_name = a.workflow_name
      WHERE i.instance_id = $1
      LIMIT 1
    `;
    const result = await this.pool.query(query, [instanceId]);
    return result.rows[0];
  }

  /**
   * Fetches the node execution logs (The "Blue Line" sequence).
   */
  async getInstanceNodes(instanceId: string): Promise<any[]> {
    const query = `SELECT * FROM zero_nodes WHERE instance_id = $1 ORDER BY enter_time ASC`;
    const result = await this.pool.query(query, [instanceId]);
    return result.rows;
  }

  /**
   * Fetches the latest snapshot of all variables for an instance.
   */
  async getVariablesSnapshot(instanceId: string): Promise<any[]> {
    const query = `
      SELECT DISTINCT ON (variable_name) variable_name, variable_value, update_time
      FROM zero_variables
      WHERE instance_id = $1
      ORDER BY variable_name, update_time DESC
    `;
    const result = await this.pool.query(query, [instanceId]);
    return result.rows;
  }

  // --- IAM & RBAC Methods ---

  /**
   * Verifies a user's credentials and returns their profile with roles and groups.
   */
  async verifyUser(username: string, pass: string): Promise<any> {
    const userQuery = `SELECT * FROM zero_users WHERE username = $1 LIMIT 1`;
    const userResult = await this.pool.query(userQuery, [username]);
    if (userResult.rows.length === 0) return null;

    const user = userResult.rows[0];
    const match = await bcrypt.compare(pass, user.password_hash);
    if (!match) return null;

    // Fetch Groups
    const groupQuery = `SELECT group_name FROM zero_user_groups WHERE username = $1`;
    const groupResult = await this.pool.query(groupQuery, [username]);
    const groups = groupResult.rows.map(r => r.group_name);

    const { password_hash, ...profile } = user;
    return { ...profile, groups };
  }

  /**
   * Creates a new user with its role.
   */
  async createUser(username: string, pass: string, role: string = 'user', fullName: string = ''): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(pass, salt);
    
    const query = `
      INSERT INTO zero_users (username, password_hash, role, full_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO UPDATE SET password_hash = $2, role = $3, full_name = $4
    `;
    await this.pool.query(query, [username, hash, role, fullName]);
  }

  /**
   * Group Management
   */
  async createGroup(name: string, description: string = ''): Promise<void> {
    const query = `INSERT INTO zero_groups (group_name, description) VALUES ($1, $2) ON CONFLICT (group_name) DO NOTHING`;
    await this.pool.query(query, [name, description]);
  }

  async addUserToGroup(username: string, groupName: string): Promise<void> {
    const query = `INSERT INTO zero_user_groups (username, group_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`;
    await this.pool.query(query, [username, groupName]);
  }

  async removeUserFromGroup(username: string, groupName: string): Promise<void> {
    const query = `DELETE FROM zero_user_groups WHERE username = $1 AND group_name = $2`;
    await this.pool.query(query, [username, groupName]);
  }

  async getGroups(): Promise<any[]> {
    const query = `SELECT * FROM zero_groups ORDER BY group_name ASC`;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Task Orchestration (Claiming Logic)
   */
  async getTasksForUser(username: string, groups: string[]): Promise<any[]> {
    const query = `
      SELECT t.*, i.workflow_name 
      FROM zero_tasks t
      JOIN zero_instances i ON t.instance_id = i.instance_id
      WHERE t.assignee = $1 
      OR (t.assignee IS NULL AND t.potential_groups ?| $2)
      ORDER BY t.created_at DESC
    `;
    const result = await this.pool.query(query, [username, groups]);
    return result.rows;
  }

  async claimTask(taskId: number, username: string): Promise<void> {
    const query = `
      UPDATE zero_tasks 
      SET assignee = $1, status = 'RESERVED' 
      WHERE id = $2 AND (assignee IS NULL OR assignee = $1)
    `;
    await this.pool.query(query, [username, taskId]);
  }

  /**
   * Administrative Control: Reassign Task
   */
  async reassignTask(taskId: number, newAssignee: string): Promise<void> {
    const query = `UPDATE zero_tasks SET assignee = $1, status = 'RESERVED' WHERE id = $2`;
    await this.pool.query(query, [newAssignee, taskId]);
  }

  /**
   * Dynamic RBAC & Permission Matrix
   */
  async getEffectivePermissions(username: string): Promise<string[]> {
    // Merges Global Role permissions with Per-Group Role permissions
    const query = `
      SELECT DISTINCT permission_key 
      FROM zero_role_permissions pr
      JOIN zero_user_groups ug ON pr.group_name = ug.group_name AND pr.role_name = ug.role
      WHERE ug.username = $1 AND pr.is_enabled = TRUE
      UNION
      -- Also include Global Role permissions (where group_name is NULL or 'GLOBAL')
      SELECT DISTINCT permission_key 
      FROM zero_role_permissions pr
      JOIN zero_users u ON pr.role_name = u.role
      WHERE u.username = $1 AND pr.is_enabled = TRUE AND (pr.group_name IS NULL OR pr.group_name = 'GLOBAL')
    `;
    const result = await this.pool.query(query, [username]);
    return result.rows.map(r => r.permission_key);
  }

  async getPermissionMatrix(): Promise<any[]> {
    const query = `
      SELECT pr.*, ac.category, ac.description 
      FROM zero_role_permissions pr
      JOIN zero_access_controls ac ON pr.permission_key = ac.permission_key
      ORDER BY pr.group_name, pr.role_name, ac.category
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async updatePermission(group: string, role: string, key: string, state: boolean): Promise<void> {
    const query = `
      INSERT INTO zero_role_permissions (group_name, role_name, permission_key, is_enabled)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (group_name, role_name, permission_key) DO UPDATE SET is_enabled = $4
    `;
    await this.pool.query(query, [group, role, key, state]);
  }

  async seedAccessControls(): Promise<void> {
    const controls = [
      ['PROCESS_VIEW', 'PROCESS', 'View high-fidelity process library and definitions'],
      ['PROCESS_WRITE', 'PROCESS', 'Create, Edit, and transactionally Deploy BPMN artifacts'],
      ['PROCESS_MONITOR', 'OPERATIONS', 'Access process monitoring and instance management dashboards'],
      ['PROCESS_OPERATIONS', 'OPERATIONS', 'Force-terminate (Abort) or Signal running instances'],
      ['TASK_REASSIGN', 'TASK', 'Administrative control to force-reassign worklist items'],
      ['IAM_ADMIN', 'SECURITY', 'Full control over Users, Groups, and the Access Matrix'],
      ['AUDIT_VIEW', 'SECURITY', 'View security logs and operational audit trails'],
      ['ANALYTICS_VIEW', 'INTELLIGENCE', 'Access Operational Intelligence and performance metrics'],
      ['PROJECT_CRUD', 'SYSTEM', 'Full lifecycle management of project containers (Create/Edit/Delete)']
    ];
    for (const [key, cat, desc] of controls) {
      await this.pool.query(`INSERT INTO zero_access_controls (permission_key, category, description) VALUES ($1, $2, $3) ON CONFLICT (permission_key) DO UPDATE SET category = $2, description = $3`, [key, cat, desc]);
    }
  }
  async getUsers(): Promise<any[]> {
    const query = `
      SELECT u.username, u.role, u.full_name, u.created_at, 
      ARRAY_AGG(ug.group_name) as groups
      FROM zero_users u
      LEFT JOIN zero_user_groups ug ON u.username = ug.username
      GROUP BY u.username, u.role, u.full_name, u.created_at
      ORDER BY u.username ASC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Closes the database pool.
   */
  async shutdown(): Promise<void> {
    await this.pool.end();
  }
}

export default Persistence;
