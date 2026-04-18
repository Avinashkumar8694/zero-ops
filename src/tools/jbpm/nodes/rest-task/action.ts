import axios from 'axios';
import jp from 'jsonpath';
import { NodeAction, NodeActivityResult } from '../registry.js';

export const action: NodeAction = async (ctx) => {
    const { endpoint, method, headers, body, timeout, responseMap } = ctx.config;
    
    // 1. Resolve Variables in Endpoint/Body
    const interpolate = (str: string) => {
        return str.replace(/\${(.*?)}/g, (_, path) => {
            const parts = path.trim().split('.');
            let val = ctx.variables;
            for (const p of parts) {
                val = val ? val[p] : undefined;
            }
            return String(val || '');
        });
    };

    const url = interpolate(endpoint);
    ctx.logger(`[REST] Invoking ${method} ${url}`);

    try {
        const response = await axios({
            url,
            method,
            headers: headers || {},
            data: body ? JSON.parse(interpolate(body)) : undefined,
            timeout: timeout || 5000
        });

        const outputs: Record<string, any> = {};
        
        // 2. Perform Response Mapping via JSONPath
        if (responseMap && typeof responseMap === 'object') {
            for (const [path, targetVar] of Object.entries(responseMap)) {
                try {
                    const value = jp.value(response.data, path as string);
                    outputs[targetVar as string] = value;
                    ctx.logger(`[REST] Mapped ${path} -> ${targetVar}`);
                } catch (e) {
                    ctx.logger(`[REST] Mapping failed for path: ${path}`);
                }
            }
        }

        return { success: true, output: outputs };
    } catch (err: any) {
        ctx.logger(`[REST] Execution Failed: ${err.message}`);
        return { success: false, error: err.message };
    }
};
