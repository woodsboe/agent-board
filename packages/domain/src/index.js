export const planStatuses = ["Draft", "Approved", "Archived"];
export const taskStatuses = ["Backlog", "Ready", "Running", "Review", "Blocked", "Done"];
export const taskPriorities = ["Low", "Medium", "High", "Critical"];
export const contextTypes = ["Architecture", "Code", "Design", "API", "Decision", "Constraint", "Example"];
export const contextSourceTypes = ["Manual", "File", "Git", "URL", "Figma"];
export const agentRunStatuses = ["Queued", "Running", "Completed", "Failed"];
export function diffContextSnapshots(previous, current) {
    const prevMap = new Map(previous.map((item) => [item.id, item]));
    const currentMap = new Map(current.map((item) => [item.id, item]));
    const added = current.filter((item) => !prevMap.has(item.id));
    const removed = previous.filter((item) => !currentMap.has(item.id));
    const modified = current.filter((item) => {
        const prev = prevMap.get(item.id);
        return Boolean(prev && (prev.updatedAt !== item.updatedAt || prev.tokenEstimate !== item.tokenEstimate || prev.title !== item.title));
    });
    return { added, removed, modified };
}
