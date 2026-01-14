/**
 * Progress Helpers
 *
 * Functions for handling progress events in the agent workflow.
 * Follows Single Responsibility Principle.
 *
 * @since v4.1
 */

import type { UIMessageChunk } from 'ai';
import type { ProgressField } from '../../types';

/**
 * Write a progress event to the WDK stream.
 * This makes progress immediately visible to clients.
 *
 * @param writer - The WritableStreamDefaultWriter to write to
 * @param progress - The progress field data
 */
export async function writeProgress(
  writer: WritableStreamDefaultWriter<UIMessageChunk>,
  progress: ProgressField
): Promise<void> {
  await writer.write({
    type: 'data-progress',
    data: progress,
    transient: true,
  } as UIMessageChunk);
}

/**
 * Extract _progress field from partial output if present.
 * Used to extract AI-driven progress updates from streaming output.
 *
 * @param partial - The partial output object from AI stream
 * @returns ProgressField if found, null otherwise
 */
export function extractProgress(partial: unknown): ProgressField | null {
  if (
    partial &&
    typeof partial === 'object' &&
    '_progress' in partial &&
    partial._progress &&
    typeof partial._progress === 'object'
  ) {
    const p = partial._progress as Record<string, unknown>;
    if (typeof p.step === 'string' && typeof p.userMessage === 'string') {
      return {
        step: p.step,
        userMessage: p.userMessage,
        estimatedProgress: typeof p.estimatedProgress === 'number' ? p.estimatedProgress : 0,
        adminDetails: typeof p.adminDetails === 'string' ? p.adminDetails : undefined,
        iconHint: p.iconHint as ProgressField['iconHint'],
        toolName: typeof p.toolName === 'string' ? p.toolName : undefined,
      };
    }
  }
  return null;
}

/**
 * Create a standard progress field with defaults.
 * DRY: Reduces repetition of progress object creation.
 */
export function createProgressField(
  step: string,
  userMessage: string,
  estimatedProgress: number,
  iconHint: ProgressField['iconHint'] = 'loading',
  extras?: Partial<ProgressField>
): ProgressField {
  return {
    step,
    userMessage,
    estimatedProgress,
    iconHint,
    ...extras,
  };
}
