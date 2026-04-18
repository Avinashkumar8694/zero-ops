-- 1. Users and Roles (JAM/IAM)
CREATE TABLE IF NOT EXISTS zero_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'USER',          -- admin, analyst, developer, manager, user
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.1 Groups: Organizational units (HR, IT, Finance)
CREATE TABLE IF NOT EXISTS zero_groups (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 User-Group Memberships
CREATE TABLE IF NOT EXISTS zero_user_groups (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) REFERENCES zero_users(username),
    group_name VARCHAR(100) REFERENCES zero_groups(group_name),
    role VARCHAR(50) DEFAULT 'USER', -- Role within this specific group
    UNIQUE(username, group_name)
);

-- 1.3 Access Control Enumeration
CREATE TABLE IF NOT EXISTS zero_access_controls (
    permission_key VARCHAR(100) PRIMARY KEY,
    category VARCHAR(50), -- PROCESS, TASK, IAM, SYSTEM
    description TEXT
);

-- 1.4 The Permission Matrix: Maps (Group x Role) -> Permission
CREATE TABLE IF NOT EXISTS zero_role_permissions (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) REFERENCES zero_groups(group_name),
    role_name VARCHAR(50),
    permission_key VARCHAR(100) REFERENCES zero_access_controls(permission_key),
    is_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(group_name, role_name, permission_key)
);

-- 2. Instances: Tracks active and completed process liftcycles
CREATE TABLE IF NOT EXISTS zero_instances (
    id SERIAL PRIMARY KEY,
    instance_id VARCHAR(255) UNIQUE NOT NULL, 
    workflow_name VARCHAR(255) NOT NULL,
    namespace VARCHAR(100) DEFAULT 'default',
    status VARCHAR(50) DEFAULT 'RUNNING',    
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    variables JSONB DEFAULT '{}',            
    metadata JSONB DEFAULT '{}',
    owner VARCHAR(100) REFERENCES zero_users(username), -- Who started the process
    parent_instance_id VARCHAR(255) REFERENCES zero_instances(instance_id)
);

-- 3. Projects: Logical containers for multiple processes
CREATE TABLE IF NOT EXISTS zero_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    namespace VARCHAR(100) DEFAULT 'default',  -- Represents the "Space"
    description TEXT,
    owner VARCHAR(100) REFERENCES zero_users(username),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Nodes: The Audit Trail (Visual Blue Line)
CREATE TABLE IF NOT EXISTS zero_nodes (
    id SERIAL PRIMARY KEY,
    instance_id VARCHAR(255) REFERENCES zero_instances(instance_id),
    node_id VARCHAR(255) NOT NULL,
    node_name VARCHAR(255),
    node_type VARCHAR(50),
    status VARCHAR(50),
    enter_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP,
    error_details TEXT
);

-- 5. Variable Logs: Temporal Audit
CREATE TABLE IF NOT EXISTS zero_variables (
    id SERIAL PRIMARY KEY,
    instance_id VARCHAR(255) REFERENCES zero_instances(instance_id),
    variable_name VARCHAR(255) NOT NULL,
    variable_value JSONB,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Assets: Stores Dynamic JSON & BPMN
CREATE TABLE IF NOT EXISTS zero_assets (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) REFERENCES zero_projects(name), -- Contextual containment
    namespace VARCHAR(100) DEFAULT 'default',
    bpmn_xml TEXT NOT NULL,
    json_config JSONB,
    version VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_name, version)
);

-- 7. Human Tasks (The Worklist)
CREATE TABLE IF NOT EXISTS zero_tasks (
    id SERIAL PRIMARY KEY,
    instance_id VARCHAR(255) REFERENCES zero_instances(instance_id),
    node_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'READY',      -- READY, RESERVED, IN_PROGRESS, COMPLETED
    assignee VARCHAR(100) REFERENCES zero_users(username), -- Final owner
    potential_groups JSONB DEFAULT '[]',     -- Groups that can claim (e.g., ["HR", "IT"])
    priority INTEGER DEFAULT 1,
    form_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 8. Deployments
CREATE TABLE IF NOT EXISTS zero_deployments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    project_name VARCHAR(255) REFERENCES zero_projects(name),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    project_path TEXT,
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_zero_nodes_instance ON zero_nodes(instance_id);
CREATE INDEX IF NOT EXISTS idx_zero_variables_instance ON zero_variables(instance_id);
CREATE INDEX IF NOT EXISTS idx_zero_tasks_assignee ON zero_tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_zero_tasks_status ON zero_tasks(status);
CREATE INDEX IF NOT EXISTS idx_zero_user_groups_user ON zero_user_groups(username);
