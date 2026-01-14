/**
 * Template Resolver
 *
 * Handles resolution of template strings like "${artifacts.profile}"
 * and input maps with nested template values.
 *
 * Follows Single Responsibility Principle.
 *
 * @since v4.1
 */

import type { InputValue } from '../../types';
import type { OrchestrationContext } from '../types';
import { getNestedValue } from './utils';

/**
 * Resolve a single template string like "${artifacts.profile}" or "${input.goals}"
 *
 * @example
 * resolveTemplate('${artifacts.profile}', ctx) // returns ctx.artifacts.profile
 * resolveTemplate('${input.goals}', ctx) // returns ctx.input.goals
 * resolveTemplate('static string', ctx) // returns 'static string'
 */
export function resolveTemplate(template: string, ctx: OrchestrationContext): unknown {
  const match = template.match(/^\$\{(.+)\}$/);
  if (!match) {
    return template; // Not a template, return as-is
  }

  const path = match[1];
  if (!path) return template;

  // Normalize path
  let normalizedPath = path.startsWith('context.') ? path.slice('context.'.length) : path;

  // Map "input.*" to ctx.input
  if (normalizedPath.startsWith('input.')) {
    const inputPath = normalizedPath.slice('input.'.length);
    return getNestedValue(ctx.input as Record<string, unknown>, inputPath);
  }

  // Map "artifacts.*" directly
  if (normalizedPath.startsWith('artifacts.')) {
    const artifactPath = normalizedPath.slice('artifacts.'.length);
    return getNestedValue(ctx.artifacts, artifactPath);
  }

  // Default: assume it's an artifact reference
  return getNestedValue(ctx.artifacts, normalizedPath);
}

/**
 * Resolve an input map with template strings.
 * Recursively processes nested objects and arrays.
 *
 * @example
 * resolveInputMap({ profile: '${artifacts.userProfile}' }, ctx)
 * // returns { profile: <resolved value> }
 */
export function resolveInputMap(
  inputMap: Record<string, InputValue>,
  ctx: OrchestrationContext
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputMap)) {
    resolved[key] = resolveValue(value, ctx);
  }

  return resolved;
}

/**
 * Resolve a single value (internal helper).
 */
function resolveValue(value: InputValue, ctx: OrchestrationContext): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('${') && value.endsWith('}')) {
      return resolveTemplate(value, ctx);
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    return resolveInputMap(value as Record<string, InputValue>, ctx);
  }

  return value;
}

/**
 * Evaluate a condition expression like "${artifacts.validation.score} < 80"
 *
 * WARNING: Uses Function constructor for dynamic evaluation.
 * Only use with trusted condition strings from WORKFLOW.md.
 */
export function evaluateCondition(condition: string, ctx: OrchestrationContext): boolean {
  const evaluated = condition.replace(/\$\{([^}]+)\}/g, (_, path) => {
    const value = resolveTemplate(`\${${path}}`, ctx);
    return JSON.stringify(value);
  });

  try {
    const fn = new Function('return ' + evaluated);
    return Boolean(fn());
  } catch {
    console.warn(`[AgentWorkflow] Failed to evaluate condition: ${condition}`);
    return false;
  }
}
