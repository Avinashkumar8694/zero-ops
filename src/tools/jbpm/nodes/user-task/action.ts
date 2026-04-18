import { NodeAction } from '../registry.js';

export const action: NodeAction = async (ctx) => {
    ctx.logger(`[USER_TASK] Suspending engine. Waiting for assignment to: ${ctx.config.assignee}`);
    
    // User tasks are passive at runtime; they rely on the engine set the status to WAITING
    // and wait for external signal.
    return { 
        success: true, 
        output: { _task_status: 'WAITING', _assignee: ctx.config.assignee } 
    };
};
