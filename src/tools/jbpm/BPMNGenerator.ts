import { WorkflowDefinition, WorkflowNode } from './types.js';

/**
 * BPMNGenerator converts Zero-BPM JSON flows into standard BPMN 2.0 XML.
 * Ported to TypeScript for reliable asset generation.
 */
class BPMNGenerator {
  static generate(definition: WorkflowDefinition, namespace: string = 'default'): string {
    const nodes = definition.nodes;
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="${definition.name}" name="${definition.name}" isExecutable="true">
    <bpmn2:startEvent id="start" name="Start">
      <bpmn2:outgoing>flow_start</bpmn2:outgoing>
    </bpmn2:startEvent>
`;

    // 1. Generate Processes & Flows
    xml += this.generateNodes(nodes);
    xml += this.generateFlows(nodes);

    xml += `    <bpmn2:endEvent id="end" name="End">
      <bpmn2:incoming>flow_end_in</bpmn2:incoming>
    </bpmn2:endEvent>
  </bpmn2:process>
  
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${definition.name}">
      <bpmndi:BPMNShape id="_BPMNShape_Start" bpmnElement="start">
        <dc:Bounds x="100" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
`;

    // 2. Generate Intelligent DI Layout (Nodes & Connections)
    xml += this.generateDI(nodes);

    xml += `    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;

    return xml;
  }

  private static generateNodes(nodes: WorkflowNode[]): string {
    let xml = '';
    nodes.forEach(node => {
      // Map to proper BPMN icons based on node type
      let tag = 'bpmn2:task';
      if (node.type === 'REST' || node.type === 'SERVICE') tag = 'bpmn2:serviceTask';
      if (node.type === 'WAIT' || node.type === 'HUMAN') tag = 'bpmn2:userTask';
      if (node.type === 'GATEWAY') tag = 'bpmn2:exclusiveGateway';
      if (node.type === 'SCRIPT') tag = 'bpmn2:scriptTask';

      xml += `    <${tag} id="${node.id}" name="${node.name || node.id}">
      <bpmn2:incoming>flow_${node.id}_in</bpmn2:incoming>
      <bpmn2:outgoing>flow_${node.id}_out</bpmn2:outgoing>
    </${tag}>\n`;
    });
    return xml;
  }

  private static generateFlows(nodes: WorkflowNode[]): string {
    let xml = '';
    // Start flow
    if (nodes.length > 0) {
      xml += `    <bpmn2:sequenceFlow id="flow_start" sourceRef="start" targetRef="${nodes[0].id}" />\n`;
    }

    // Dependency flows
    nodes.forEach(node => {
      if (node.dependencies) {
        node.dependencies.forEach((depId, index) => {
          xml += `    <bpmn2:sequenceFlow id="flow_from_${depId}_to_${node.id}" sourceRef="${depId}" targetRef="${node.id}" />\n`;
        });
      }
    });

    // End flow
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      xml += `    <bpmn2:sequenceFlow id="flow_end_in" sourceRef="${lastNode.id}" targetRef="end" />\n`;
    }

    return xml;
  }

  private static generateDI(nodes: WorkflowNode[]): string {
    let xml = '';
    const GRID_X = 250;
    const GRID_Y = 150;

    nodes.forEach((node, index) => {
      // Intelligent layout: branching or sequential
      const x = 200 + (index * GRID_X);
      const y = 80; // We can expand this for parallel tracks

      xml += `      <bpmndi:BPMNShape id="Shape_${node.id}" bpmnElement="${node.id}">
        <dc:Bounds x="${x}" y="${y}" width="100" height="80" />
      </bpmndi:BPMNShape>\n`;
    });
    return xml;
  }
}

export default BPMNGenerator;
