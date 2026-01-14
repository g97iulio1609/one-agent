/**
 * WDK Postgres World Configuration
 *
 * Configures the Workflow Development Kit to use PostgreSQL for workflow persistence.
 * This enables durable workflow execution with checkpoint/resume capability.
 *
 * @since SDK v4.0
 */

import { setWorld, getWorld } from '@workflow/core/runtime';

// Cached world instance
let worldInitialized = false;

/**
 * Attempt to terminate idle connections before WDK init.
 * This helps avoid MaxClientsInSessionMode errors on Supabase.
 */
async function cleanupStaleConnections(connectionString: string): Promise<void> {
  try {
    // Dynamic import pg
    const { default: pg } = await import('pg');

    const client = new pg.Client({ connectionString });
    await client.connect();

    // Try to terminate idle connections (may fail without superuser privileges)
    // We specifically target pg-boss / WDK connections by application name or query pattern
    const result = await client.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE pid <> pg_backend_pid()
        AND state = 'idle'
        AND application_name LIKE '%pg-boss%'
        AND query_start < NOW() - INTERVAL '30 seconds'
    `);

    console.log(`[WDK] Cleaned up ${result.rowCount || 0} stale pg-boss connections`);

    await client.end();
  } catch (err) {
    // Expected to fail on Supabase without elevated privileges
    console.log('[WDK] Connection cleanup skipped (requires elevated privileges)');
  }
}
export async function initializeWDKWorld(): Promise<void> {
  if (worldInitialized) {
    console.log('[WDK] World already initialized');
    return;
  }

  // IMPORTANT: WDK requires a DIRECT connection, not a PgBouncer pooled connection
  // Supabase Session Mode has strict limits (MaxClientsInSessionMode error)
  // Use WORKFLOW_DIRECT_URL (port 5432) instead of DATABASE_URL (port 6543)
  let connectionString =
    process.env.WORKFLOW_DIRECT_URL || // Preferred: Direct connection
    process.env.WORKFLOW_POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn('[WDK] No WORKFLOW_DIRECT_URL, WORKFLOW_POSTGRES_URL, or DATABASE_URL set');
    console.warn('[WDK] Durable workflows will NOT persist across restarts');
    return;
  }

  // Log which connection type we're using
  const isDirectConnection =
    connectionString.includes(':5432') || process.env.WORKFLOW_DIRECT_URL !== undefined;

  console.log('[WDK] Connection type:', isDirectConnection ? 'DIRECT' : 'POOLED (may fail)');

  // Try to cleanup stale connections before initializing WDK
  await cleanupStaleConnections(connectionString);

  try {
    // Dynamic import to avoid bundling when not used
    const { createWorld } = await import('@workflow/world-postgres');

    // Use low concurrency to minimize connection pressure
    const concurrency = parseInt(process.env.WORKFLOW_CONCURRENCY || '1', 10);

    const world = await createWorld({
      connectionString,
      jobPrefix: process.env.WORKFLOW_JOB_PREFIX || 'wdk_',
      queueConcurrency: concurrency,
      // Note: @workflow/world-postgres doesn't support pool options
      // The connection string must be a direct connection (not pooled)
    });

    // Start the world (required for pg-boss job processing)
    await world.start();

    setWorld(world);
    worldInitialized = true;

    console.log('[WDK] ✅ Postgres World initialized successfully');
    console.log('[WDK] Job prefix:', process.env.WORKFLOW_JOB_PREFIX || 'wdk_');
    console.log('[WDK] Concurrency:', concurrency);
  } catch (error) {
    console.error('[WDK] ❌ Failed to initialize Postgres World:', error);
    console.error('[WDK] 💡 TIP: Set WORKFLOW_DIRECT_URL to your direct Postgres URL (port 5432)');
    console.error('[WDK] Durable workflows will NOT persist across restarts');
    // Don't throw - allow app to continue without durability
  }
}

/**
 * Check if WDK World is available
 */
export function isWDKWorldAvailable(): boolean {
  try {
    const world = getWorld();
    return !!world;
  } catch {
    return false;
  }
}

/**
 * Get WDK World status for health checks
 */
export async function getWDKWorldStatus(): Promise<{
  available: boolean;
  type: string;
  jobPrefix?: string;
  concurrency?: number;
}> {
  if (!worldInitialized) {
    return { available: false, type: 'none' };
  }

  try {
    return {
      available: true,
      type: 'postgres',
      jobPrefix: process.env.WORKFLOW_JOB_PREFIX || 'wdk_',
      concurrency: parseInt(process.env.WORKFLOW_CONCURRENCY || '5', 10),
    };
  } catch {
    return { available: false, type: 'none' };
  }
}

export default {
  initializeWDKWorld,
  isWDKWorldAvailable,
  getWDKWorldStatus,
};
