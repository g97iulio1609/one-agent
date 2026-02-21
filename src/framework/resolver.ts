/**
 * OneAgent SDK v4.2 - Template Resolver
 *
 * Resolves template strings like "${context.artifacts.profile}"
 * into actual values from the context.
 */

import type { Context, InputValue } from './types';

// ==================== UTILITIES ====================

/**
 * Get a value from an object at a dot-notation path
 */
function get(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Set a value in an object at a dot-notation path
 */
function set(obj: unknown, path: string, value: unknown): void {
  const keys = path.split('.');
  if (keys.length === 0) return;

  let current = obj as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!key) continue;
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey) {
    current[lastKey] = value;
  }
}

// ==================== PUBLIC API ====================

/**
 * Resolve a single template string
 *
 * @example
 * resolveTemplate("${context.artifacts.profile.name}", context)
 * // Returns the value at context.artifacts.profile.name
 */
export function resolveTemplate(template: string, context: Context): unknown {
  // Check if it's a template string
  const match = template.match(/^\$\{(.+)\}$/);
  if (!match) {
    // Not a template, return as-is
    return template;
  }

  const path = match[1];
  if (!path) {
    return template;
  }
  return resolvePath(context, path);
}

/**
 * Resolve a path from context
 *
 * Supports these path formats:
 * - "input.goals" → context.artifacts.input.goals
 * - "artifacts.selectedExercises" → context.artifacts.selectedExercises
 * - "context.artifacts.profile" → context.artifacts.profile
 *
 * @example
 * resolvePath(context, "input.goals")
 * resolvePath(context, "artifacts.weeklySchedule")
 */
export function resolvePath(context: Context, path: unknown): unknown {
  // Type guard: if path is not a string, return it as-is (literal value)
  if (typeof path !== 'string') {
    return path;
  }

  // Remove "context." prefix if present
  let normalizedPath = path.startsWith('context.') ? path.slice('context.'.length) : path;

  // Map "input.*" to "artifacts.input.*" (workflow stores input in artifacts.input)
  if (normalizedPath.startsWith('input.')) {
    normalizedPath = 'artifacts.' + normalizedPath;
  }

  // Map "artifacts.*" prefix is already correct, but ensure path starts with artifacts
  // if it doesn't match any known top-level context property
  if (
    !normalizedPath.startsWith('artifacts.') &&
    !normalizedPath.startsWith('executionId') &&
    !normalizedPath.startsWith('userId') &&
    !normalizedPath.startsWith('basePath') &&
    !normalizedPath.startsWith('memory') &&
    !normalizedPath.startsWith('meta')
  ) {
    // Assume it's a reference to artifacts
    normalizedPath = 'artifacts.' + normalizedPath;
  }

  return get(context, normalizedPath);
}

/**
 * Resolve an input map with template strings
 *
 * @example
 * resolveInputMap({
 *   userId: "${context.input.userId}",
 *   weekNumber: 1,  // Literal preserved
 *   preferences: "${context.artifacts.userPrefs}"
 * }, context)
 */
export function resolveInputMap(
  inputMap: Record<string, InputValue>,
  context: Context
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputMap)) {
    if (typeof value === 'string') {
      // Check if it's a template
      if (value.startsWith('${') && value.endsWith('}')) {
        resolved[key] = resolveTemplate(value, context);
      } else {
        // Literal string
        resolved[key] = value;
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      // Primitive values - pass through directly
      resolved[key] = value;
    } else if (Array.isArray(value)) {
      // Arrays - pass through directly
      resolved[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Nested objects - recursively resolve
      resolved[key] = resolveInputMap(value as Record<string, InputValue>, context);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Set a value in context at the specified path
 *
 * @example
 * setContextValue(context, "context.artifacts.profile", { name: "John" })
 */
export function setContextValue(context: Context, path: string, value: unknown): void {
  // Remove "context." prefix if present
  const normalizedPath = path.startsWith('context.') ? path.slice('context.'.length) : path;

  set(context, normalizedPath, value);
}

/**
 * Evaluate a condition expression
 *
 * @example
 * evaluateCondition("${context.artifacts.validation.score} < 80", context)
 */
export function evaluateCondition(condition: string, context: Context): boolean {
  // Replace all ${...} with actual values
  const evaluated = condition.replace(/\$\{([^}]+)\}/g, (_, path) => {
    const value = resolvePath(context, path);
    return JSON.stringify(value);
  });

  // Evaluate the expression safely
  try {
    // Use Function constructor to evaluate (safer than eval)
    const fn = new Function('return ' + evaluated);
    return Boolean(fn());
  } catch {
    console.warn(`[Resolver] Failed to evaluate condition: ${condition}`);
    return false;
  }
}

/**
 * Clone context for isolated execution (used in loops)
 */
export function cloneContext(context: Context): Context {
  return {
    ...context,
    artifacts: JSON.parse(JSON.stringify(context.artifacts)),
    memory: [...context.memory],
    meta: { ...context.meta },
  };
}
