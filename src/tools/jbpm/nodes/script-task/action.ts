import { NodeAction } from '../registry.js';

export const action: NodeAction = async (ctx) => {
    const { script, outputMapping } = ctx.config;
    ctx.logger(`[SCRIPT] Executing tactical snippet...`);
    
    try {
        // High-performance sandbox execution
        // The script may mutate variables directly or return a local result object.
        const execute = new Function('variables', 'ctx', `
            try {
                const __result = (() => {
                    ${script}
                })();
                return { success: true, result: __result };
            } catch (e) {
                return { success: false, error: e.message };
            }
        `);
        
        const result = execute(ctx.variables, ctx);
        
        if (result.success) {
            const outputs: Record<string, any> = {};
            const localScope = (result.result && typeof result.result === 'object' && !Array.isArray(result.result))
                ? result.result
                : {};

            if (outputMapping && typeof outputMapping === 'object') {
                for (const [sourceKey, mappingConfig] of Object.entries(outputMapping)) {
                    const targetVar = typeof mappingConfig === 'object' && mappingConfig !== null
                        ? (mappingConfig as any).target
                        : mappingConfig;

                    if (!targetVar) continue;
                    outputs[targetVar as string] = localScope[sourceKey];
                }
            }

            // Fall back to current behavior when no explicit mapping is declared.
            const finalOutput = Object.keys(outputs).length > 0 ? outputs : ctx.variables;
            ctx.logger(`[SCRIPT] Execution successful. Variables hydrated.`);
            return { success: true, output: finalOutput };
        } else {
            return { success: false, error: result.error };
        }
    } catch (err: any) {
        ctx.logger(`[SCRIPT] Runtime Error: ${err.message}`);
        return { success: false, error: err.message };
    }
};
