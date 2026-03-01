/**
 * OneAgent SDK - Server Entry Point
 *
 * Server-only exports for AI providers, agents, and utilities.
 * Import from '@giulio-leone/one-agent/server' in server components,
 * API routes, and other server-side code.
 *
 * DO NOT import this in client components.
 *
 * @packageDocumentation
 */

// Adapters (server-only: imports @ai-sdk/openai, @ai-sdk/anthropic)
export * from './adapters/VercelAIProvider';

// Server-side agents
export * from './agents/copilot';
export * from './agents/chat';

// AI agent setup utilities
export * from './utils/ai-agent-setup';
