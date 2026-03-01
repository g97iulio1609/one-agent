/**
 * @giulio-leone/lib-copilot
 *
 * Copilot client-side exports (components and hooks)
 *
 * Note: Server-side context builders are not exported here to avoid
 * importing server-only code in Client Components. Import them directly
 * from their files when needed in Server Components or API routes.
 */

// Client-side exports only
// NOTE: useCopilotChat è stato rimosso - usa useCopilotChatCore da @giulio-leone/lib-chat-core
export * from './components';

// Hooks for route sync and context management
export * from './hooks';

// Providers for domain context
export * from './providers';

// NOTE: Framework (MCP tool factories) is NOT re-exported here
// to avoid pulling server-only AI SDK deps into client bundles.
// Import from '@giulio-leone/one-agent/framework' directly.
