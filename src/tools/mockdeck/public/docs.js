import { LitElement, html, css } from 'lit';
import '/lit_component/zero-badge.js';
import '/lit_component/zero-button.js';
import '/lit_component/zero-section.js';

class MockDeckDocs extends LitElement {
    static properties = {
        activeTab: { type: String }
    };

    static styles = css`
        :host {
            display: block;
            background: #040c16;
            min-height: 100vh;
            color: #edf4ff;
            font-family: 'Inter', system-ui, sans-serif;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 40px;
            padding: 40px 20px;
        }
        aside {
            position: sticky;
            top: 40px;
            height: fit-content;
        }
        .nav-group { margin-bottom: 24px; }
        .nav-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #4fd1c5; margin-bottom: 10px; letter-spacing: 0.05em; }
        .nav-item {
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: 0.2s;
            color: #9db0c7;
            font-size: 0.9rem;
            margin-bottom: 4px;
        }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: #edf4ff; }
        .nav-item.active { background: rgba(79,209,197,0.1); color: #4fd1c5; font-weight: 600; }
        
        main { line-height: 1.6; }
        h1 { font-size: 2.6rem; margin: 0 0 16px; letter-spacing: -0.02em; line-height: 1.1; }
        h2 { font-size: 1.8rem; margin: 48px 0 20px; color: #4fd1c5; border-bottom: 1px solid rgba(79,209,197,0.2); padding-bottom: 12px; }
        h3 { font-size: 1.3rem; margin: 32px 0 16px; color: #edf4ff; font-weight: 700; }
        p { margin: 0 0 18px; color: #d4e3f6; font-size: 1.05rem; }
        .lead { font-size: 1.2rem; color: #9db0c7; }
        
        code { background: rgba(79,209,197,0.1); color: #7be7dd; padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
        pre { background: #0a192f; padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); overflow-x: auto; margin: 24px 0; position: relative; }
        pre::before { content: 'CODE'; position: absolute; top: 0; right: 20px; font-size: 0.65rem; font-weight: 800; color: rgba(255,255,255,0.2); letter-spacing: 0.1em; }
        
        .feature-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); margin: 24px 0; }
        .card {
            background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 20px;
            padding: 24px;
            transition: transform 0.2s, border-color 0.2s;
        }
        .card:hover { transform: translateY(-4px); border-color: rgba(79,209,197,0.4); }
        .card h3 { margin-top: 0; font-size: 1.15rem; color: #4fd1c5; }
        
        .step-box { border-left: 4px solid #4fd1c5; padding-left: 20px; margin: 24px 0; }
        .back-btn { margin-bottom: 24px; }
        
        table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 0.95rem; }
        th { text-align: left; padding: 12px; border-bottom: 2px solid rgba(255,255,255,0.1); color: #4fd1c5; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
        td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #d4e3f6; vertical-align: top; }
        
        strong { color: #edf4ff; }
        .highlight { color: #f6ad55; font-weight: 600; }
    `;

    constructor() {
        super();
        this.activeTab = 'getting-started';
    }

    render() {
        return html`
            <div class="container">
                <aside>
                    <zero-button class="back-btn" tone="alt" href="/__mockdeck">← Back to Dashboard</zero-button>
                    
                    <div class="nav-group">
                        <div class="nav-label">Foundations</div>
                        <div class="nav-item ${this.activeTab === 'getting-started' ? 'active' : ''}" @click=${() => this.activeTab = 'getting-started'}>Getting Started</div>
                        <div class="nav-item ${this.activeTab === 'studio' ? 'active' : ''}" @click=${() => this.activeTab = 'studio'}>API Components Studio</div>
                    </div>

                    <div class="nav-group">
                        <div class="nav-label">Runner Workflows</div>
                        <div class="nav-item ${this.activeTab === 'chaining' ? 'active' : ''}" @click=${() => this.activeTab = 'chaining'}>Response Chaining</div>
                        <div class="nav-item ${this.activeTab === 'variables' ? 'active' : ''}" @click=${() => this.activeTab = 'variables'}>Variables & Environment</div>
                        <div class="nav-item ${this.activeTab === 'datasets' ? 'active' : ''}" @click=${() => this.activeTab = 'datasets'}>Working with Datasets</div>
                        <div class="nav-item ${this.activeTab === 'iterations' ? 'active' : ''}" @click=${() => this.activeTab = 'iterations'}>Runs & Iterations</div>
                    </div>

                    <div class="nav-group">
                        <div class="nav-label">Reference</div>
                        <div class="nav-item ${this.activeTab === 'scripts' ? 'active' : ''}" @click=${() => this.activeTab = 'scripts'}>Scripting Context (ctx)</div>
                        <div class="nav-item ${this.activeTab === 'faq' ? 'active' : ''}" @click=${() => this.activeTab = 'faq'}>Q&A / Debugging</div>
                    </div>

                    <div class="nav-group">
                        <div class="nav-label">Advanced</div>
                        <div class="nav-item ${this.activeTab === 'media' ? 'active' : ''}" @click=${() => this.activeTab = 'media'}>Files & Media</div>
                    </div>
                </aside>

                <main>
                    ${this.renderContent()}
                </main>
            </div>
        `;
    }

    renderContent() {
        switch(this.activeTab) {
            case 'getting-started': return this.renderGettingStarted();
            case 'studio': return this.renderStudio();
            case 'chaining': return this.renderChaining();
            case 'variables': return this.renderVariables();
            case 'datasets': return this.renderDatasets();
            case 'iterations': return this.renderIterations();
            case 'scripts': return this.renderScripts();
            case 'faq': return this.renderFAQ();
            case 'media': return this.renderMedia();
            default: return html`<h1>Topic not found</h1>`;
        }
    }

    renderGettingStarted() {
        return html`
            <zero-badge>Foundation</zero-badge>
            <h1>MockDeck Comprehensive Guide</h1>
            <p class="lead">MockDeck is an all-in-one studio for API simulation, automated workflow testing, and dynamic data-driven execution.</p>
            
            <h2>What can you do with MockDeck?</h2>
            <div class="feature-grid">
                <div class="card">
                    <h3>🎭 Rapid Mocking</h3>
                    <p>Create local endpoints in seconds using valid JSON templates, Handlebars logic, or static files.</p>
                </div>
                <div class="card">
                    <h3>⚡ Real Integration</h3>
                    <p>Attach real backend endpoints and chain them with mocks to test hybrid cloud scenarios.</p>
                </div>
                <div class="card">
                    <h3>🔄 Visual Workflows</h3>
                    <p>Design visual DAGs in the Runner to define exactly how APIs should be called in sequence.</p>
                </div>
                <div class="card">
                    <h3>📊 Data Execution</h3>
                    <p>Run your workflows against thousands of CSV or Excel rows with full concurrency control.</p>
                </div>
            </div>

            <h3>Studio Core Philosophy</h3>
            <p>MockDeck is **Local-First**. Your data is stored in your project, meaning your mocks and workflows can be committed to source control and used by the entire team using the <code>zero-ops mockdeck</code> command.</p>
        `;
    }

    renderStudio() {
        return html`
            <h1>API Component Studio</h1>
            <p>The Studio is where you define your "building blocks." You can manage **Real APIs**, **Mocks**, and **Proxies**.</p>
            
            <h3>Component Types</h3>
            <table>
                <thead><tr><th>Type</th><th>Purpose</th><th>Capabilities</th></tr></thead>
                <tbody>
                    <tr>
                        <td><strong>Mock API</strong></td>
                        <td>Simulate a non-existent or inaccessible endpoint locally.</td>
                        <td>Handlebars dynamic templates, custom status codes, artificial delays.</td>
                    </tr>
                    <tr>
                        <td><strong>Real API</strong></td>
                        <td>Reference an actual backend service (e.g., Auth0, Stripe, Internal API).</td>
                        <td>Full header/body control, integration into Runner workflows.</td>
                    </tr>
                    <tr>
                        <td><strong>Proxy API</strong></td>
                        <td>Create a local route that forwards traffic to another server.</td>
                        <td>Delay upstream traffic, inject/override headers before forwarding.</td>
                    </tr>
                </tbody>
            </table>

            <h3>Managing Components</h3>
            <div class="step-box">
                <p><strong>1. Adding</strong>: Click the <code>+</code> in the sidebar or use the <strong>Quick Add</strong> panel. You can define folders to keep things organized.</p>
                <p><strong>2. Editing</strong>: Select any item in the tree. Changes are saved instantly to the local <code>store.json</code>.</p>
                <p><strong>3. Deleting</strong>: Right-click any node in the sidebar tree or use the <strong>Delete</strong> button in the bottom settings panel.</p>
            </div>
            
            <p class="highlight">💡 Pro Tip: Drag a component from the Studio library directly onto the Runner Canvas to add it to a workflow.</p>
        `;
    }

    renderChaining() {
        return html`
            <h1>Response Chaining & Passing</h1>
            <p>One of MockDeck's most powerful features is the ability to take data from one node's response and use it in the next request.</p>

            <h3>The Login -> Profile Tutorial</h3>
            <div class="step-box">
                <p><strong>Step 1: The Login Node</strong>. Call your <code>/login</code> API. In the <strong>Post-Script</strong> section, extract the token:</p>
                <pre>
// node: login-api
// Post-Script
if (ctx.response.statusCode === 200) {
    ctx.globals.token = ctx.response.body.auth.access_token;
}
return ctx;</pre>
            </div>

            <div class="step-box">
                <p><strong>Step 2: The Profile Node</strong>. Connect the Login node to the Profile node. In the Profile node settings, reference the variable:</p>
                <p><strong>Header:</strong> <code>Authorization</code>: <code>Bearer {{globals.token}}</code></p>
                <p><strong>URL:</strong> <code>https://api.com/user/{{globals.token}}/profile</code></p>
            </div>

            <h3>Conditional Chaining</h3>
            <p>You can even decide whether to run a node based on previous results:</p>
            <pre>
// Pre-Script of a "Delete Data" node
if (!ctx.globals.should_cleanup) {
    ctx.skip = true; // This node will be skipped entirely
}
return ctx;</pre>
        `;
    }

    renderVariables() {
        return html`
            <h1>Environment vs Globals</h1>
            <p>Managing state across large workflows requires a clear variable strategy.</p>

            <h3>1. Environment Variables (Static)</h3>
            <p>Environments (Local, Dev, Production) set constant values like <code>base_url</code> or <code>api_key</code>. These are accessed via <code>{{env.key}}</code>.</p>
            <pre>
// Access in Script
const url = ctx.environment.variables.base_url;

// Access in URL/Body template
{{env.base_url}}/api/v1/auth</pre>

            <h3>2. Global Variables (Dynamic)</h3>
            <p>Globals are transient variables that live for the duration of a **single scenario run**. They allow nodes to share data. Access via <code>{{globals.key}}</code>.</p>
            <pre>
// Set in a node's Post-Script
ctx.globals.order_id = "ORD-123";

// Use in next node's Body
{ "order": "{{globals.order_id}}" }</pre>

            <p class="highlight">⚠️ Note: Globals are reset to empty for every new iteration or dataset row to ensure run isolation.</p>
        `;
    }

    renderDatasets() {
        return html`
            <h1>Working with Datasets</h1>
            <p>Datasets allow you to perform "Volume Testing." You upload a CSV/Excel file, and MockDeck executes your workflow once for every single row.</p>

            <h3>Mapping Dataset Values</h3>
            <p>If your CSV has a column <code>email</code>, you can use it anywhere in your node templates using <code>{{row.email}}</code>.</p>
            
            <h3>Processing in Scripts</h3>
            <p>Access the current row data within Pre/Post scripts using <code>ctx.row</code>:</p>
            <pre>
// Pre-Script
// Modify request body based on row data
ctx.request.body = {
    user: ctx.row.username,
    external_id: ctx.row.id_from_csv
};

return ctx;</pre>

            <h3>How results are grouped</h3>
            <p>In the Live Monitor, events are grouped by <strong>Scenario Key</strong> (e.g., <code>1:0</code>). This means Iteration 1, Row 0.</p>
        `;
    }

    renderIterations() {
        return html`
            <h1>Runs, Iterations & Concurrency</h1>
            <p>Understanding how MockDeck schedules your tasks is key to efficient testing.</p>

            <h3>The Math of Total Runs</h3>
            <p>The total number of scenarios executed is calculated as follows:</p>
            <p style="text-align:center; font-size:1.4rem; padding:20px; background:rgba(255,255,255,0.03); border-radius:12px;">
                <strong>Total Runs = Iterations × Dataset Rows</strong>
            </p>

            <div class="card" style="margin-top:20px;">
                <h3>Example Scenario</h3>
                <p>If you set <strong>Iterations = 2</strong> and upload a dataset with **50 users**:</p>
                <ul>
                    <li>The full workflow will execute **100 times**.</li>
                    <li>The Live Monitor will show 100 Scenarios.</li>
                    <li>If you use No Dataset, MockDeck treats it as a single row <code>{}</code>.</li>
                </ul>
            </div>

            <h3>Concurrency Control</h3>
            <p>Concurrency defines how many scenarios run in parallel. Setting this to <code>10</code> will process 10 dataset rows simultaneously. Use this to stress-test your backend or verify race conditions.</p>
        `;
    }

    renderScripts() {
        return html`
            <h1>Scripting Context (ctx)</h1>
            <p>The <code>ctx</code> object is the source of truth for your scripts. Returning the modified <code>ctx</code> from your script updates the internal state.</p>
            
            <table>
                <thead><tr><th>Field</th><th>Description</th></tr></thead>
                <tbody>
                    <tr><td><code>ctx.request</code></td><td>The outgoing request object (available in Pre-Scripts).</td></tr>
                    <tr><td><code>ctx.response</code></td><td>The received response object (available in Post-Scripts).</td></tr>
                    <tr><td><code>ctx.globals</code></td><td>Temporary store for sharing data between nodes.</td></tr>
                    <tr><td><code>ctx.row</code></td><td>Data from the current dataset row.</td></tr>
                    <tr><td><code>ctx.environment</code></td><td>Variables from the active environment.</td></tr>
                    <tr><td><code>ctx.iteration</code></td><td>Number. The current iteration index.</td></tr>
                    <tr><td><code>ctx.rowIndex</code></td><td>Number. The current row index in the dataset.</td></tr>
                    <tr><td><code>ctx.skip</code></td><td>Boolean. Set to <code>true</code> to bypass the current node.</td></tr>
                </tbody>
            </table>

            <h3>The Helper Object (<code>helpers</code>)</h3>
            <p>MockDeck provides a set of utility methods to simplify complex object manipulation and validation.</p>
            <table>
                <thead><tr><th>Method</th><th>Description</th></tr></thead>
                <tbody>
                    <tr><td><code>helpers.get(obj, path)</code></td><td>Retrieve a nested value (e.g., <code>"response.body.users[0].id"</code>).</td></tr>
                    <tr><td><code>helpers.set(obj, path, val)</code></td><td>Safely set a nested value, creating objects along the path if they don't exist.</td></tr>
                    <tr><td><code>helpers.assert(cond, msg)</code></td><td>Throw an error if the condition is false. In post-scripts, this fails the step.</td></tr>
                </tbody>
            </table>

            <h3>Practical Example: Token Extraction</h3>
            <pre>
// Post-Script
const token = helpers.get(ctx.response.body, "auth.token");
helpers.assert(token, "Authentication failed: No token found in response.");
ctx.globals.sessionToken = token;
return ctx;</pre>

            <h3>Pre-Script Logic</h3>
            <pre>
// Skip if iteration is even
if (ctx.iteration % 2 === 0) {
    ctx.skip = true;
}
return ctx;</pre>
        `;
    }

    renderFAQ() {
        return html`
            <h1>Q&A / Debugging</h1>
            
            <div class="qa-card">
                <span class="qa-q">Q: My iteration is set to 1, but it runs multiple times?</span>
                <p>Check your dataset. If you have a dataset with 5 rows attached, Iteration 1 will run all 5 rows. Remove the dataset if you want a single execution.</p>
            </div>

            <div class="qa-card">
                <span class="qa-q">Q: How do I handle large file uploads in Mocks?</span>
                <p>MockDeck supports "Media" mocks. Add a new Mock, select "Media" as the type, and upload your file. It will be served with the correct Content-Type locally.</p>
            </div>

            <div class="qa-card">
                <span class="qa-q">Q: Can I simulate a slow network?</span>
                <p>Yes. In your node properties or Mock definition, set a <strong>Delay (ms)</strong>. The runner will wait for this duration before resolving the request.</p>
            </div>

            <div class="qa-card">
                <span class="qa-q">Q: Where can I see full logs?</span>
                <p>In the **Monitor View**, click any scenario or log item. It expands to show full JSON payloads for both the request and response.</p>
            </div>
        `;
    }

    renderMedia() {
        return html`
            <zero-badge>Advanced</zero-badge>
            <h1>Working with Files & Media</h1>
            <p>MockDeck provides full support for binary files and multipart data, both when mocking local endpoints and consuming real ones.</p>

            <h3>1. Advanced Body Types</h3>
            <p>MockDeck now supports Postman-style body configurations for advanced API interactions:</p>
            <div class="step-box">
                <p><strong>Multipart/Form-Data</strong>: Use this for mixed-media uploads. You can add multiple key-value pairs where the value is either text or a binary file picked from your system.</p>
                <p><strong>x-www-form-urlencoded</strong>: Ideal for traditional HTML form submissions. Data is automatically encoded and the <code>Content-Type</code> header is set.</p>
                <p><strong>Binary</strong>: Send a single raw file as the entire request body.</p>
            </div>

            <h3>2. Constructing Multiparts in Scripts</h3>
            <p>While the UI handles most cases, you can manually override multipart data in a <strong>Pre-Script</strong> by modifying the <code>ctx.request.formData</code> array:</p>
            <pre>
// Pre-Script
ctx.request.formData = [
  { key: "username", value: ctx.row.name, type: "text" },
  { key: "avatar", value: ctx.globals.imageBase64, type: "file", fileName: "user.png" }
];
return ctx;</pre>

            <p class="highlight">💡 Pro Tip: To preview a Media Mock or a Multipart response, use the <strong>Console</strong> in the Studio. MockDeck renders common media types (PNG, PDF, JSON) directly in the preview window.</p>
        `;
    }
}

customElements.define('mockdeck-docs', MockDeckDocs);
