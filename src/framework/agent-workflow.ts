/**
 * OneAgent SDK v4.1 - Agent Workflow (Backward Compatibility)
 *
 * This file re-exports from the modular agent-workflow/ directory.
 * Maintains backward compatibility for existing imports.
 *
 * @deprecated Import directly from './agent-workflow' (the directory) for new code.
 * @since v4.2 - Refactored to modular structure
 */

// Re-export everything from the modular structure
export {
  agentWorkflow,
  type AgentWorkflowParams,
  type AgentWorkflowResult,
} from './agent-workflow/index';
