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
 * @since v5.0 - Added manifest caching for performance (avoid reload on WDK replay)
 */

import { normalizeAgentPath } from '../helpers';
import { toSerializableManifestInfo, type SerializableManifestInfo } from '../types';

// ============================================================================
// MANIFEST CACHING
// ============================================================================
// Cache manifests at module level to avoid repeated disk reads during WDK replay.
// Key format: `${normalizedPath}:${basePath}`

const _manifestCache = new Map<string, SerializableManifestInfo>();

// Cached loader module
let _loadAgentManifest: typeof import('../../loader').loadAgentManifest | null = null;

async function getLoader() {
  if (!_loadAgentManifest) {
    const mod = await import('../../loader');
    _loadAgentManifest = mod.loadAgentManifest;
  }
  return _loadAgentManifest;
}

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

  const agentPath = normalizeAgentPath(agentId);
  const cacheKey = `${agentPath}:${basePath}`;

  // Return cached manifest if available
  const cached = _manifestCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const loadAgentManifest = await getLoader();
  const manifest = await loadAgentManifest(agentPath, basePath);

  // Convert to serializable format (strips Zod schemas)
  const serializableManifest = toSerializableManifestInfo(manifest);

  // Cache for future calls
  _manifestCache.set(cacheKey, serializableManifest);

  return serializableManifest;
}

// WDK retry config
(loadManifestStep as unknown as { maxRetries: number }).maxRetries = 2;
