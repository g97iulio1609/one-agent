/**
 * Agent Workflow Utilities
 *
 * General utility functions used across the workflow module.
 * Follows Single Responsibility Principle.
 *
 * @since v4.1
 */

/**
 * Estimate token count (rough approximation when not available from stream).
 * Uses ~4 characters per token approximation.
 */
export function estimateTokens(systemPrompt: string, userPrompt: string, output: unknown): number {
  const totalChars = systemPrompt.length + userPrompt.length + JSON.stringify(output || {}).length;
  return Math.ceil(totalChars / 4);
}

/**
 * Get nested value from object using dot notation.
 * Supports paths like "finalProgram" or "finalProgram.program"
 *
 * @example
 * getNestedValue({ a: { b: 1 } }, 'a.b') // returns 1
 * getNestedValue({ a: { b: 1 } }, 'a.c') // returns undefined
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Normalize agent path to consistent format.
 * DRY: This was repeated 3 times in the original file.
 *
 * @example
 * normalizeAgentPath('exercise-selector') // returns 'sdk-agents/exercise-selector'
 * normalizeAgentPath('workers/exercise-selector') // returns 'workers/exercise-selector'
 * normalizeAgentPath('sdk-agents/my-agent') // returns 'sdk-agents/my-agent'
 */
export function normalizeAgentPath(agentId: string): string {
  if (agentId.startsWith('workers/')) {
    return agentId;
  }
  if (agentId.startsWith('sdk-agents/')) {
    return agentId;
  }
  return `sdk-agents/${agentId}`;
}

/**
 * Normalize path for sub-agent (workers).
 */
export function normalizeWorkerPath(agentId: string): string {
  if (agentId.startsWith('workers/')) {
    return agentId;
  }
  return `workers/${agentId}`;
}
