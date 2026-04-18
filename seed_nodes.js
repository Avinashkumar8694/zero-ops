const fs = require('fs');
const path = require('path');

const nodes = [
    { id: 'start-event', label: 'Start Process', type: 'bpmn:StartEvent', category: 'EVENT', icon: 'bpmn-icon-start-event-none' },
    { id: 'end-event', label: 'End Process', type: 'bpmn:EndEvent', category: 'EVENT', icon: 'bpmn-icon-end-event-none' },
    { id: 'timer-start-event', label: 'Timer Start', type: 'bpmn:StartEvent', category: 'EVENT', icon: 'bpmn-icon-start-event-timer' },
    { id: 'message-start-event', label: 'Message Start', type: 'bpmn:StartEvent', category: 'EVENT', icon: 'bpmn-icon-start-event-message' },
    { id: 'terminate-event', label: 'Terminate Instance', type: 'bpmn:EndEvent', category: 'EVENT', icon: 'bpmn-icon-end-event-terminate' },
    { id: 'parallel-gateway', label: 'Parallel Fork', type: 'bpmn:ParallelGateway', category: 'GATEWAY', icon: 'bpmn-icon-gateway-parallel' },
    { id: 'inclusive-gateway', label: 'Inclusive Branch', type: 'bpmn:InclusiveGateway', category: 'GATEWAY', icon: 'bpmn-icon-gateway-or' },
    { id: 'event-based-gateway', label: 'Signal Decision', type: 'bpmn:EventBasedGateway', category: 'GATEWAY', icon: 'bpmn-icon-gateway-eventbased' },
    { id: 'business-rule-task', label: 'Decision Table', type: 'bpmn:BusinessRuleTask', category: 'TASK', icon: 'bpmn-icon-business-rule-task' },
    { id: 'manual-task', label: 'Physical Action', type: 'bpmn:ManualTask', category: 'TASK', icon: 'bpmn-icon-manual-task' },
    { id: 'send-task', label: 'Send Signal', type: 'bpmn:SendTask', category: 'TASK', icon: 'bpmn-icon-send-task' },
    { id: 'receive-task', label: 'Wait for Signal', type: 'bpmn:ReceiveTask', category: 'TASK', icon: 'bpmn-icon-receive-task' },
    { id: 'call-activity', label: 'Sub-Process', type: 'bpmn:CallActivity', category: 'SUITE', icon: 'bpmn-icon-call-activity' },
    { id: 'sub-process', label: 'Embedded Logic', type: 'bpmn:SubProcess', category: 'SUITE', icon: 'bpmn-icon-subprocess-expanded' }
];

const nodesDir = path.join(__dirname, 'src/tools/jbpm/nodes');

nodes.forEach(n => {
    const dir = path.join(nodesDir, n.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // 1. package.json
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        name: n.id,
        version: "1.0.0",
        bpmnType: n.type,
        category: n.category,
        label: n.label,
        description: `Industrial ${n.label} primitive for Zero-BPM orchestration.`
    }, null, 4));

    // 2. README.md
    fs.writeFileSync(path.join(dir, 'README.md'), `# ${n.label} (V1.0.0)\n\n${n.label} primitive for Zero-BPM orchestration.`);

    // 3. icon.svg (if icon folder exists)
    const assetDir = path.join(dir, 'assets');
    if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir);
    fs.writeFileSync(path.join(assetDir, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="20" x="2" y="2" rx="2"/></svg>`);

    console.log(`[Seeder] Provisioned ${n.id}`);
});
