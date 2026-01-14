/**
 * Manifest Step
 *
 * Durable step for loading agent manifests.
 * Returns SerializableManifestInfo to avoid WDK serialization issues with Zod schemas.
 *
 * Follows Single Responsibility Principle.
 *
 * @since v4.1
 * @since v4.2 - Returns SerializableManifestInfo instead of AgentManifest
 */

import { normalizeAgentPath } from '../helpers';
import { toSerializableManifestInfo, type SerializableManifestInfo } from '../types';

/**
 * Load agent manifest as a durable step.
 * Returns a serializable version (without Zod schemas) for WDK compatibility.
 *
 * IMPORTANT: This returns SerializableManifestInfo, NOT AgentManifest.
 * Zod schemas are NOT serializable and will cause WDK serialization errors.
 * Steps that need the full manifest with schemas must load it internally.
 *
 * @see https://useworkflow.dev/err/serialization-failed
 *
 * WDK Configuration:
 * - maxRetries: 2 (manifest loading can have transient failures)
 */
export async function loadManifestStep(
  agentId: string,
  basePath: string
): Promise<SerializableManifestInfo> {
  'use step';

  const { loadAgentManifest } = await import('../../loader');

  const agentPath = normalizeAgentPath(agentId);
  const manifest = await loadAgentManifest(agentPath, basePath);

  // Convert to serializable format (strips Zod schemas)
  return toSerializableManifestInfo(manifest);
}

// WDK retry config
(loadManifestStep as unknown as { maxRetries: number }).maxRetries = 2;
