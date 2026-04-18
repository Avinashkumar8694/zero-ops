// --- ZERO-BPM INDUSTRIAL PRIMITIVE REGISTRY AGGREGATOR (V6.5) ---
console.log('[Zero-BPM] Initializing Registry Aggregator...');

// 1. Events (Genesis & Terminal)
import './start-event/index.js';
import './end-event/index.js';
import './timer-start-event/index.js';
import './message-start-event/index.js';
import './terminate-event/index.js';

// 2. Gateways (Orchestration Logic)
import './exclusive-gateway/index.js';
import './parallel-gateway/index.js';
import './inclusive-gateway/index.js';
import './event-based-gateway/index.js';

// 3. Tasks (Atomic Work Units)
import './rest-task/index.js';
import './user-task/index.js';
import './script-task/index.js';
import './business-rule-task/index.js';
import './manual-task/index.js';
import './send-task/index.js';
import './receive-task/index.js';
import './email-task/index.js';
import './database-task/index.js';
import './slack-task/index.js';

// 4. Suites & Systems (Hierarchical Logic)
import './call-activity/index.js';
import './sub-process/index.js';

// 5. Events (Exception & Extension)
import './error-event/index.js';

// 6. Flows (Directed Edges)
import './sequence-flow/index.js';

// Final Export of the Hydrated Registry
export { NODE_REGISTRY } from './registry.js';
export type { ActionContext } from './registry.js';

console.log('[Zero-BPM] Registry Aggregator Finalized.');
