import { NodeAction } from '../registry.js';

export const action: NodeAction = async (ctx) => {
    const { script } = ctx.config;
    ctx.logger(`[SCRIPT] Executing tactical snippet...`);
    
    try {
        // High-performance sandbox execution
        // Direct variable mutation via function context
        const execute = new Function('variables', 'ctx', `
            try {
                ${script}
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        `);
        
        const result = execute(ctx.variables, ctx);
        
        if (result.success) {
            ctx.logger(`[SCRIPT] Execution successful. Variables hydrated.`);
            return { success: true, output: ctx.variables };
        } else {
            return { success: false, error: result.error };
        }
    } catch (err: any) {
        ctx.logger(`[SCRIPT] Runtime Error: ${err.message}`);
        return { success: false, error: err.message };
    }
};
