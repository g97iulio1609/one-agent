/**
 * Worker Step
 *
 * Durable step for executing Worker agents with ToolLoopAgent.
 * This is the core execution step for non-Manager agents.
 *
 * Follows Single Responsibility Principle - only handles worker execution.
 *
 * @since v4.1
 */

import { ToolLoopAgent, stepCountIs, Output } from 'ai';
import { FatalError, RetryableError, getStepMetadata } from 'workflow';
import type { UIMessageChunk } from 'ai';
import type { ProgressField } from '../../types';
import {
  normalizeAgentPath,
  estimateTokens,
  writeProgress,
  extractProgress,
  createProgressField,
} from '../helpers';

/**
 * Result from worker step execution.
 */
export interface WorkerStepResult {
  object: unknown;
  usage?: { totalTokens?: number };
}

/**
 * Execute a Worker sub-agent with streaming progress.
 * Uses ToolLoopAgent internally and streams _progress events.
 *
 * @param writable - WritableStream passed from the workflow
 * @param agentId - Agent identifier
 * @param basePath - Base path for agent resolution
 * @param inputJson - JSON-serialized input
 * @param userId - Optional user ID
 * @param stepPrefix - Optional prefix for progress step names (for nested context)
 *
 * WDK Configuration:
 * - maxRetries: 3 (with exponential backoff)
 */
export async function executeWorkerStep(
  writable: WritableStream<UIMessageChunk>,
  agentId: string,
  basePath: string,
  inputJson: string,
  _userId?: string,
  stepPrefix?: string
): Promise<WorkerStepResult> {
  'use step';

  const metadata = getStepMetadata();
  const writer = writable.getWriter();
  const prefix = stepPrefix ? `${stepPrefix}:` : '';

  try {
    const input = JSON.parse(inputJson);

    await writeProgress(
      writer,
      createProgressField(`${prefix}init`, 'Initializing...', 5, 'loading')
    );

    // Dynamically import framework modules
    const { loadAgentManifest } = await import('../../loader');
    const { buildSystemPrompt } = await import('../../worker');
    const { connectToMCPServers, mcpToolsToAiSdk } = await import('../../mcp');
    const { getAgentTools } = await import('../../registry');
    const { PROGRESS_PROMPT_INSTRUCTIONS } = await import('../../types');
    const { getModelByTier, AIProviderConfigService, createModelAsync } =
      await import('@onecoach/lib-ai');

    const agentPath = normalizeAgentPath(agentId);
    const manifest = await loadAgentManifest(agentPath, basePath);

    await writeProgress(
      writer,
      createProgressField(`${prefix}loading`, 'Loading agent configuration...', 10, 'loading')
    );

    // Build system prompt with progress instructions
    let systemPrompt = await buildSystemPrompt(manifest, input);
    systemPrompt = systemPrompt + '\n\n' + PROGRESS_PROMPT_INSTRUCTIONS;

    console.log(`[WorkerStep] ${agentId} system prompt: ${systemPrompt.length} chars`);

    // Load tools
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {};

    const registryTools = getAgentTools(agentId);
    if (registryTools) {
      Object.assign(tools, registryTools);
    }

    if (manifest.mcpServers) {
      try {
        await writeProgress(
          writer,
          createProgressField(`${prefix}connecting`, 'Connecting to services...', 15, 'loading')
        );

        const mcpTools = await connectToMCPServers(manifest.mcpServers);
        const aiSdkTools = mcpToolsToAiSdk(mcpTools);
        Object.assign(tools, aiSdkTools);
        console.log(`[WorkerStep] ${agentId} loaded ${Object.keys(aiSdkTools).length} MCP tools`);
      } catch (err) {
        console.warn(`[WorkerStep] ${agentId} MCP connection failed:`, err);
      }
    }

    // Get model config
    const tier = manifest.config.tier || 'balanced';
    const modelConfig = await getModelByTier(tier);
    console.log(
      `[WorkerStep] ${agentId} using model: ${modelConfig.model} (${modelConfig.provider})`
    );

    // Get API key
    const OAUTH_PROVIDERS = ['gemini-cli'];
    const isOAuthProvider = OAUTH_PROVIDERS.includes(modelConfig.provider);
    const apiKey = await AIProviderConfigService.getApiKey(
      modelConfig.provider as import('@onecoach/lib-ai').ProviderName
    );

    if (!apiKey && !isOAuthProvider) {
      throw new FatalError(`API key missing for provider ${modelConfig.provider}`);
    }

    // Create model
    const model = await createModelAsync(
      modelConfig as import('@onecoach/lib-ai').ModelConfig,
      apiKey ?? '',
      manifest.config.temperature
    );

    // Build user prompt
    const userPrompt =
      typeof input === 'string'
        ? input
        : `Process the following input and generate a ${agentId} output:\n\n${JSON.stringify(input, null, 2)}`;

    // Create ToolLoopAgent
    const maxSteps = manifest.config.maxSteps ?? 10;

    const agent = new ToolLoopAgent({
      model,
      instructions: systemPrompt,
      tools,
      stopWhen: stepCountIs(maxSteps),
      toolChoice: Object.keys(tools).length > 0 ? 'auto' : 'none',
      output: Output.object({
        schema: manifest.interface.output,
      }),
    });

    await writeProgress(
      writer,
      createProgressField(`${prefix}executing`, 'Processing request...', 20, 'loading')
    );

    // Execute with streaming
    const streamResult = await agent.stream({ prompt: userPrompt });

    let lastProgress: ProgressField | null = null;
    let tokensUsed = 0;

    // Process fullStream for tool events
    const fullStreamPromise = processToolStream(
      streamResult.fullStream,
      writer,
      prefix,
      lastProgress,
      (p) => {
        lastProgress = p;
      }
    );

    // Process partialOutputStream for AI-driven _progress
    const partialStreamPromise = processProgressStream(
      streamResult.partialOutputStream,
      writer,
      prefix,
      (p) => {
        lastProgress = p;
      },
      agentId
    );

    await Promise.all([fullStreamPromise, partialStreamPromise]);

    const finalOutput = await streamResult.output;
    tokensUsed = estimateTokens(systemPrompt, userPrompt, finalOutput);

    await writeProgress(
      writer,
      createProgressField(`${prefix}complete`, 'Complete!', 100, 'success')
    );

    console.log(`[WorkerStep] ${agentId} execution complete`);

    return {
      object: finalOutput,
      usage: { totalTokens: tokensUsed },
    };
  } catch (error) {
    // WDK-native retry with exponential backoff
    if (metadata.attempt < 3 && !(error instanceof FatalError)) {
      throw new RetryableError(error instanceof Error ? error.message : String(error), {
        retryAfter: Math.pow(2, metadata.attempt) * 1000, // 2s, 4s, 8s
      });
    }
    throw error;
  } finally {
    writer.releaseLock();
  }
}

// WDK retry config
(executeWorkerStep as unknown as { maxRetries: number }).maxRetries = 3;

/**
 * Process tool call/result events from fullStream.
 */
async function processToolStream(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fullStream: AsyncIterable<any>,
  writer: WritableStreamDefaultWriter<UIMessageChunk>,
  prefix: string,
  lastProgress: ProgressField | null,
  setLastProgress: (p: ProgressField) => void
): Promise<void> {
  try {
    for await (const chunk of fullStream) {
      if (chunk.type === 'tool-call') {
        const toolInput = 'input' in chunk ? chunk.input : undefined;
        const toolProgress = createProgressField(
          `${prefix}tool:${chunk.toolName}`,
          `Calling ${chunk.toolName}...`,
          lastProgress?.estimatedProgress ?? 40,
          'search',
          {
            toolName: chunk.toolName,
            adminDetails: toolInput
              ? `Args: ${JSON.stringify(toolInput).slice(0, 200)}`
              : undefined,
          }
        );
        await writeProgress(writer, toolProgress);
      } else if (chunk.type === 'tool-result') {
        const resultProgress = createProgressField(
          `${prefix}tool:${chunk.toolName}:result`,
          `${chunk.toolName} completed`,
          Math.min((lastProgress?.estimatedProgress ?? 40) + 10, 80),
          'success',
          { toolName: chunk.toolName }
        );
        await writeProgress(writer, resultProgress);
        setLastProgress(resultProgress);
      }
    }
  } catch (err) {
    console.warn(`[WorkerStep] fullStream error:`, err);
  }
}

/**
 * Process AI-driven _progress fields from partialOutputStream.
 */
async function processProgressStream(
  partialStream: AsyncIterable<unknown>,
  writer: WritableStreamDefaultWriter<UIMessageChunk>,
  prefix: string,
  setLastProgress: (p: ProgressField) => void,
  agentId: string
): Promise<void> {
  try {
    for await (const partial of partialStream) {
      const progress = extractProgress(partial);
      if (progress) {
        progress.step = `${prefix}${progress.step}`;
        await writeProgress(writer, progress);
        setLastProgress(progress);
      }
    }
  } catch (err) {
    console.warn(`[WorkerStep] ${agentId} partialOutputStream error:`, err);
  }
}
