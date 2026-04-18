import axios from 'axios';
import { execSync } from 'child_process';

/**
 * KIEClient manages interactions with the jBPM KIE Server REST API.
 */
class KIEClient {
  constructor(config) {
    this.baseURL = config.baseURL;
    this.auth = {
      username: config.username,
      password: config.password
    };
    this.containerId = config.containerId;
  }

  /**
   * Starts a new Generic Process instance.
   */
  async startProcess(processId, variables = {}) {
    const url = `${this.baseURL}/containers/${this.containerId}/processes/${processId}/instances`;
    const response = await axios.post(url, variables, { auth: this.auth });
    return response.data; // The Process Instance ID
  }

  /**
   * Injects a dynamic task into a running process instance.
   */
  async injectDynamicTask(processInstanceId, node) {
    const url = `${this.baseURL}/containers/${this.containerId}/processes/instances/${processInstanceId}/tasks`;
    const payload = {
      name: node.id,
      nodeType: 'UniversalHandler',
      data: {
        protocol: node.type,
        config: node.config,
        inputs: node.inputs || {}
      }
    };
    const response = await axios.post(url, payload, { auth: this.auth });
    return response.data;
  }

  /**
   * Retrieves tasks for a process instance.
   */
  async getTasks(processInstanceId) {
    const url = `${this.baseURL}/queries/tasks/instances/process/${processInstanceId}`;
    const response = await axios.get(url, { auth: this.auth });
    return response.data.taskSummary || [];
  }
  
  /**
   * Completes a task and returns results.
   */
  async completeTask(taskId, results = {}) {
     const url = `${this.baseURL}/containers/${this.containerId}/tasks/${taskId}/states/completed`;
     await axios.put(url, results, { auth: this.auth });
  }
  /**
   * Retrieves specific output data for a task instance.
   */
  async getTaskOutput(taskId) {
    const url = `${this.baseURL}/containers/${this.containerId}/tasks/${taskId}/contents/output`;
    const response = await axios.get(url, { auth: this.auth });
    return response.data || {};
  }

  /**
   * Uploads a Maven artifact (JAR or POM) to the Business Central internal repository.
   */
  async uploadArtifact(groupId, artifactId, version, fileBuffer, isPom = false) {
    const groupPath = groupId.replace(/\./g, '/');
    const filename = `${artifactId}-${version}.${isPom ? 'pom' : 'jar'}`;
    
    // Construct Business Central Maven URL from KIE Server URL
    // From: http://SERVER:8080/kie-server/services/rest/server
    // To: http://SERVER:8080/business-central/maven2
    const bcBaseURL = this.baseURL.split('/kie-server')[0] + '/business-central';
    const url = `${bcBaseURL}/maven2/${groupPath}/${artifactId}/${version}/${filename}`;

    console.log(`Uploading artifact to: ${url}`);
    
    await axios.put(url, fileBuffer, {
      auth: this.auth,
      headers: {
        'Content-Type': isPom ? 'application/xml' : 'application/java-archive'
      }
    });
  }

  /**
   * Deploys a new container to the KIE Server.
   * Includes a self-healing fallback for internal Maven resolution issues.
   */
  async createContainer(containerId, gacx) {
    const { "group-id": groupId, "artifact-id": artifactId, "version": version } = gacx;
    
    // Add a small delay to ensure Business Central repo has indexed the artifact
    console.log('Waiting 2 seconds for artifact indexing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const url = `${this.baseURL}/containers/${containerId}`;
    const payload = {
      "container-id": containerId,
      "release-id": gacx
    };

    try {
      const response = await axios.put(url, payload, { 
        auth: this.auth,
        headers: { 'Content-Type': 'application/json' }
      });
      
      // SYNC: Also register in Controller to ensure UI visibility
      await this.registerInController(containerId, gacx);

      return response.data;
    } catch (err) {
      const msg = err.response?.data?.msg || err.message;
      if (msg.includes('Cannot find KieModule') || msg.includes("already exists") || msg.includes("already another KieContainer created")) {
        console.warn('\n--- Self-Healing: Triggered by Conflict or Resolution Error ---');
        console.log('Attempting to manually bridge artifact within the container...');
        
        try {
          const groupPath = groupId.replace(/\./g, '/');
          const sourcePath = `/opt/jboss/wildfly/bin/repositories/kie/global/${groupPath}/${artifactId}/${version}`;
          const targetPath = `/opt/jboss/.m2/repository/${groupPath}/${artifactId}/${version}`;
          
          const dockerCmd = `docker exec -u root zero-flow-engine bash -c "mkdir -p ${targetPath} && cp ${sourcePath}/${artifactId}-${version}.* ${targetPath}/"`;
          
          console.log(`Running: ${dockerCmd}`);
          execSync(dockerCmd);
          
          console.log('Artifact bridged successfully. Cleaning up failed container record...');
          try {
            await axios.delete(url, { auth: this.auth });
          } catch (delErr) {
            // Ignore delete error if container didn't fully exist
          }

          console.log('Retrying container registration...');
          const response = await axios.put(url, payload, { 
            auth: this.auth,
            headers: { 'Content-Type': 'application/json' }
          });

          // SYNC: Also register in Controller to ensure UI visibility
          await this.registerInController(containerId, gacx);

          return response.data;
        } catch (healErr) {
          console.error('Self-healing failed:', healErr.response?.data || healErr.message);
          throw err; // Throw original error if healing fails
        }
      }
      throw err;
    }
  }

  /**
   * Registers a container in the Business Central Controller (Control Plane).
   * This is what ensures 'Deployment' visibility in the UI.
   */
  async registerInController(containerId, gacx) {
    // Derive Controller URL
    const controllerBaseURL = this.baseURL.split('/kie-server')[0] + '/business-central/rest/controller';
    const serverId = process.env.KIE_SERVER_ID || 'sample-server';
    
    const url = `${controllerBaseURL}/management/servers/${serverId}/containers/${containerId}`;
    
    console.log(`Synchronizing with Business Central Controller: ${containerId}`);

    const payload = {
      "container-id": containerId,
      "container-alias": containerId,
      "server-template-id": serverId,
      "release-id": gacx,
      "status": "STARTED",
      "configs": {}
    };

    try {
      await axios.put(url, payload, {
        auth: this.auth,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('Controller synchronization successful.');
    } catch (err) {
      console.warn('Controller synchronization warning:', err.response?.data || err.message);
      // We don't throw here to avoid failing the whole deployment if just the UI sync fails
    }
  }

  /**
   * Lists all active containers on the server.
   */
  async getContainers() {
    const url = `${this.baseURL}/containers`;
    const response = await axios.get(url, { auth: this.auth });
    return response.data?.result?.['kie-containers']?.['kie-container'] || [];
  }
}

export default KIEClient;
