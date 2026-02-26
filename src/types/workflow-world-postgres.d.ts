/**
 * Type declarations for @workflow/world-postgres (optional peer dependency).
 * These mirror the actual package types to enable TypeScript resolution
 * without requiring the package to be installed.
 */

declare module '@workflow/world-postgres' {
  import type { World } from '@workflow/world';

  export interface PostgresWorldConfig {
    connectionString: string;
    jobPrefix?: string;
    queueConcurrency?: number;
  }

  export function createWorld(config?: PostgresWorldConfig): World & {
    start(): Promise<void>;
  };
}
