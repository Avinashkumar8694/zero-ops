package com.zero.jbpm.handlers;

import org.kie.api.runtime.process.WorkItem;
import org.kie.api.runtime.process.WorkItemHandler;
import org.kie.api.runtime.process.WorkItemManager;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.OutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

import java.io.Serializable;

/**
 * UniversalWorkItemHandler captures all dynamic task injections
 * and executes specialized logic based on the 'protocol' parameter.
 */
public class UniversalWorkItemHandler implements WorkItemHandler, Serializable {

    private static final long serialVersionUID = 1L;
    private static final Logger logger = LoggerFactory.getLogger(UniversalWorkItemHandler.class);

    @Override
    public void executeWorkItem(WorkItem workItem, WorkItemManager manager) {
        String protocol = (String) workItem.getParameter("protocol");
        Map<String, Object> payload = (Map<String, Object>) workItem.getParameter("payload");
        Map<String, Object> inputs = (Map<String, Object>) workItem.getParameter("inputs");

        logger.info("Executing UniversalHandler for node: {} with protocol: {}", workItem.getName(), protocol);

        Map<String, Object> results = new HashMap<>();

        try {
            switch (protocol != null ? protocol.toUpperCase() : "NONE") {
                case "REST":
                    results = handleRest(payload, inputs);
                    break;
                case "SCRIPT":
                    results = handleScript(payload, inputs);
                    break;
                case "RULE":
                    results = handleRule(payload, inputs);
                    break;
                case "EMAIL":
                    results = handleEmail(payload, inputs);
                    break;
                case "USER":
                    results = handleUserTask(payload, inputs);
                    break;
                case "SIGNAL":
                    results = handleSignal(payload, inputs);
                    break;
                case "MILESTONE":
                    results = handleMilestone(payload, inputs);
                    break;
                case "CALL_ACTIVITY":
                    results = handleCallActivity(payload, inputs);
                    break;
                case "MANUAL":
                    results = handleManualTask(payload, inputs);
                    break;
                case "COMPENSATION":
                    results = handleCompensation(payload, inputs);
                    break;
                default:
                    logger.warn("Unknown protocol: {}. No action taken.", protocol);
                    break;
            }
        } catch (Exception e) {
            logger.error("Error executing UniversalHandler for node: " + workItem.getName(), e);
            manager.abortWorkItem(workItem.getId());
            return;
        }

        manager.completeWorkItem(workItem.getId(), results);
    }

    private Map<String, Object> handleRest(Map<String, Object> payload, Map<String, Object> inputs) {
        logger.info("Universal REST Logic Placeholder");
        // Real implementation would use an HTTP client here
        Map<String, Object> out = new HashMap<>();
        out.put("status", 200);
        out.put("body", "REST logic not yet implemented in Java");
        return out;
    }

    private Map<String, Object> handleScript(Map<String, Object> payload, Map<String, Object> inputs) {
        logger.info("Universal SCRIPT Logic Placeholder");
        Map<String, Object> out = new HashMap<>();
        out.put("message", "Script executed");
        return out;
    }

    private Map<String, Object> handleRule(Map<String, Object> payload, Map<String, Object> inputs) {
        logger.info("Universal RULE Logic Placeholder");
        return new HashMap<>();
    }

    private Map<String, Object> handleEmail(Map<String, Object> payload, Map<String, Object> inputs) {
        logger.info("Universal EMAIL Logic Placeholder: Sending email to {}", payload.get("to"));
        return new HashMap<>();
    }

    private Map<String, Object> handleUserTask(Map<String, Object> payload, Map<String, Object> inputs) {
        logger.info("Universal USER_TASK Logic Placeholder: Assigning to actor {}", payload.get("actor"));
        return new HashMap<>();
    }

    private Map<String, Object> handleSignal(Map<String, Object> payload, Map<String, Object> inputs) {
        logger.info("Universal SIGNAL Logic Placeholder: Triggering {}", payload.get("signalName"));
        return new HashMap<>();
    }

    private Map<String, Object> handleMilestone(Map<String, Object> payload, Map<String, Object> inputs) {
        logger.info("Universal MILESTONE Logic Placeholder: Achieving {}", payload.get("milestoneName"));
        return new HashMap<>();
    }

    private Map<String, Object> handleCallActivity(Map<String, Object> payload, Map<String, Object> inputs) {
        logger.info("Universal CALL_ACTIVITY Logic Placeholder: Starting sub-process {}", payload.get("processId"));
        return new HashMap<>();
    }

    private Map<String, Object> handleManualTask(Map<String, Object> payload, Map<String, Object> inputs) {
        logger.info("Universal MANUAL_TASK Logic Placeholder: Simple logging.");
        return new HashMap<>();
    }

    private Map<String, Object> handleCompensation(Map<String, Object> payload, Map<String, Object> inputs) {
        logger.info("Universal COMPENSATION Logic Placeholder: Rolling back {}...", payload.get("activityId"));
        return new HashMap<>();
    }

    @Override
    public void abortWorkItem(WorkItem workItem, WorkItemManager manager) {
        logger.info("Aborting task: {}", workItem.getName());
    }
}
