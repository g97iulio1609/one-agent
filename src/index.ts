/**
 * OneAgent SDK 4.2
 *
 * Native AI agent framework for onecoach.
 * Durable streaming, skill visibility, and weighted progress.
 * Following KISS, DRY, and SOLID principles.
 *
 * @packageDocumentation
 */

// Version (single source of truth)
export { SDK_VERSION, SDK_MAJOR, SDK_MINOR } from './core/version';
export { SDK_VERSION as VERSION } from './core/version';

// Core
export * from './core/types';
export * from './core/type-helpers';
export * from './core/BaseAgent';
export * from './core/CostCalculator';

// Re-export core AI types
export { z } from 'zod';
export type { LanguageModel, UIMessage } from 'ai';

// Adapters
export * from './adapters/VercelAIProvider';

// Schemas
export * from './schemas/nutrition.schema';
export * from './schemas/workout.schema';

// Mesh
export * from './mesh/types';
export { MeshAgent } from './mesh/MeshAgent';
export { MeshCoordinator, type CoordinatorConfig } from './mesh/MeshCoordinator';
export * from './mesh/PerformanceMonitor';
export * from './mesh/SimpleCache';

// Copilot Agent (usa ChatAgent per i flussi moderni)
export * from './agents/copilot';

// Chat Agent — server-only (imports lib-ai), import from '@giulio-leone/one-agent/chat'
// export * from './agents/chat';

// Agent Registry — server-only, import directly from '@giulio-leone/one-agent/registry/*'

// Utils — server-only, import directly from '@giulio-leone/one-agent/utils/*'
// export * from './utils/ai-agent-setup';
