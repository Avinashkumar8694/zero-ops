import { NodeAction } from '../registry.js';

export const action: NodeAction = async (ctx) => {
    const { conditionExpression, isDefault } = ctx.config;
    
    if (isDefault) {
        ctx.logger(`[EDGE] Evaluating as DEFAULT path.`);
        return { success: true, output: { result: true } };
    }

    if (!conditionExpression) {
        ctx.logger(`[EDGE] No condition defined. Defaulting to true.`);
        return { success: true, output: { result: true } };
    }

    ctx.logger(`[EDGE] Evaluating condition: ${conditionExpression}`);
    
    try {
        const execute = new Function('variables', `
            try {
                return !!(${conditionExpression});
            } catch (e) {
                return false;
            }
        `);
        
        const result = execute(ctx.variables);
        ctx.logger(`[EDGE] Condition evaluated to: ${result}`);
        return { success: true, output: { result } };
    } catch (err: any) {
        ctx.logger(`[EDGE] Evaluation Error: ${err.message}`);
        return { success: false, error: err.message };
    }
};
