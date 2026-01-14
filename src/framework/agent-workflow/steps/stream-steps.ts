/**
 * Stream Steps
 *
 * Durable steps for stream operations (write progress, finish, close).
 * According to WDK docs, stream interactions MUST happen in steps.
 *
 * @see https://useworkflow.dev/docs/api-reference/workflow/get-writable
 * @since v4.1
 */

import type { UIMessageChunk } from 'ai';
import type { ProgressField } from '../../types';

/**
 * Write a progress event to the stream as a durable step.
 *
 * IMPORTANT: According to WDK docs, stream interactions MUST happen in steps,
 * not directly in workflow functions.
 */
export async function writeProgressStep(
  writable: WritableStream<UIMessageChunk>,
  progress: ProgressField
): Promise<void> {
  'use step';

  const writer = writable.getWriter();
  try {
    await writer.write({
      type: 'data-progress',
      data: progress,
      transient: true,
    } as UIMessageChunk);
  } finally {
    writer.releaseLock();
  }
}

/**
 * Write final result to the stream as a durable step.
 */
export async function writeFinishStep(
  writable: WritableStream<UIMessageChunk>,
  output: unknown
): Promise<void> {
  'use step';

  const writer = writable.getWriter();
  try {
    await writer.write({
      type: 'data-finish',
      data: {
        success: true,
        output,
      },
    } as UIMessageChunk);
  } finally {
    writer.releaseLock();
  }
}

/**
 * Close the writable stream to signal completion.
 *
 * IMPORTANT: According to WDK documentation, this MUST be a separate step.
 * @see https://useworkflow.dev/docs/foundations/streaming
 */
export async function closeStreamStep(writable: WritableStream<UIMessageChunk>): Promise<void> {
  'use step';
  await writable.close();
}
