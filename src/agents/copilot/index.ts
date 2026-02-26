/**
 * Copilot Agent - Exports
 *
 * Unified copilot agent for OneAgent SDK 4.2
 */

export {
  CopilotMeshCoordinator,
  createCopilotMeshCoordinator,
  type CopilotCoordinatorConfig,
  type CopilotConversation,
} from './CopilotMeshCoordinator';

export {
  CopilotInputSchema,
  CopilotOutputSchema,
  type CopilotInput,
  type CopilotOutput,
} from './CopilotMeshCoordinator';

// Stub: one-agent will be replaced by a new framework
export function useGlobalCopilotContext(_opts?: { debug?: boolean }): void {}
export function useCopilotContextReporter(): void {}
export function CopilotDomainProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  return children;
}
