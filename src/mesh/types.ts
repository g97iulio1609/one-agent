/**
 * Agent Mesh Types
 *
 * Type definitions for multi-agent mesh architecture
 * Supports collaboration, delegation, and shared context
 */

import { z } from 'zod';
import type { AgentConfig, AgentError } from '../core/types';

/**
 * Mesh-specific agent result (extends core AgentResult)
 */
export interface MeshAgentResult<TOutput> {
  output: TOutput;
  tokensUsed: number;
  costUSD: number;
  metadata?: Record<string, unknown>;
}

/**
 * Checkpoint for validation between agents
 */
export interface Checkpoint {
  phase: string;
  isValid: boolean;
  criticalIssues: string[];
  warnings: string[];
  canContinue: boolean;
}

/**
 * Agent roles in mesh
 * Extended to support custom roles beyond enum
 */
export enum AgentRole {
  COORDINATOR = 'coordinator',
  COPILOT = 'copilot',
  CALORIE_CALCULATION = 'calorie_calculation',
  MEAL_PLANNING = 'meal_planning',
  FOOD_SELECTION = 'food_selection',
  RECIPE_GENERATION = 'recipe_generation',
  DAY_GENERATION = 'day_generation',
  VALIDATION = 'validation',
  PERSONALIZATION = 'personalization',
  WORKOUT_PLANNING = 'workout_planning',
  WORKOUT_DAY_GENERATION = 'workout_day_generation',
  EXERCISE_SELECTION = 'exercise_selection',
  EXERCISE_GENERATION = 'exercise_generation',
  FOOD_GENERATION = 'food_generation',
  PROGRESSION = 'progression',
  ANALYTICS = 'analytics',
  ONEAGENDA = 'oneagenda',
  MEAL_GENERATION = 'meal_generation',
}

/**
 * Agent role type - supports both enum and custom string roles
 */
export type AgentRoleType = AgentRole | string;

/**
 * Agent execution metadata
 */
export interface AgentExecution {
  agentRole: AgentRole;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  tokensUsed?: number;
  cost?: number;
  success: boolean;
  error?: AgentError;
  retries: number;
}

/**
 * Shared context for mesh agents
 */
export interface SharedContext<TInput = unknown, TPartialResults = unknown> {
  // Request ID for tracing
  requestId: string;

  // Input data
  input: TInput;

  // User context
  userId: string;

  // Partial results from agents
  partialResults: TPartialResults;

  // Execution history
  executionHistory: AgentExecution[];

  // Current step
  currentStep: string;

  // Metadata
  metadata: {
    startedAt: Date;
    lastUpdatedAt: Date;
    [key: string]: unknown;
  };

  // Flags
  needsRetry: boolean;
  retryCount: number;
  maxRetries: number;
}

/**
 * Task for agent delegation
 */
export interface AgentTask<TInput = unknown, TOutput = unknown> {
  role: AgentRole;
  description: string;
  input: TInput;
  priority: 'low' | 'medium' | 'high';
  timeout?: number;
  retryable: boolean;
  expectedOutput?: z.ZodSchema<TOutput>;
}

/**
 * Agent collaboration request
 */
export interface CollaborationRequest {
  initiatorRole: AgentRole;
  collaboratorRoles: AgentRole[];
  task: string;
  sharedData: Record<string, unknown>;
}

/**
 * Validation result from ValidationAgent
 */
export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  score: number; // 0-100
  suggestions: string[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  description: string;
  affectedAgent?: AgentRole;
  suggestedFix?: string;
}

/**
 * Mesh agent configuration
 */
export interface MeshAgentConfig<TInput, TOutput> extends AgentConfig<TInput, TOutput> {
  aiProvider: import('../core/types').IAIProvider;
  costCalculator: import('../core/types').ICostCalculator;
  systemPrompt?: string;
  role: AgentRole;
  expertise: string[];
  canDelegate: boolean;
  collaborators?: AgentRole[];
  priority: number; // Execution priority (1-10)
  onLog?: (message: string, metadata?: unknown) => void;
}

/**
 * Coordinator orchestration result
 */
export interface OrchestrationResult<TOutput> {
  success: boolean;
  output?: TOutput;
  error?: AgentError;
  executionSummary: {
    totalDuration: number;
    totalTokens: number;
    totalCost: number;
    agentExecutions: AgentExecution[];
    retryCount: number;
    validationPasses: number;
  };
}

/**
 * Mesh event for streaming
 */
export type MeshEvent<TOutput> =
  | { type: 'agent_start'; data: { role: AgentRole; description: string } }
  | { type: 'agent_progress'; data: { role: AgentRole; progress: number; message: string } }
  | {
      type: 'agent_complete';
      data: {
        role: AgentRole;
        duration: number;
        output?: unknown;
        tokensUsed?: number;
        costUSD?: number;
      };
    }
  | { type: 'agent_error'; data: { role: AgentRole; error: AgentError; retrying: boolean } }
  | { type: 'delegation'; data: { from: AgentRole; to: AgentRole; task: string } }
  | { type: 'collaboration'; data: { agents: AgentRole[]; task: string } }
  | { type: 'validation'; data: ValidationResult }
  | { type: 'retry'; data: { role: AgentRole; attempt: number; maxAttempts: number } }
  | {
      type: 'complete';
      data: { output: TOutput; summary: OrchestrationResult<TOutput>['executionSummary'] };
    }
  | {
      type: 'agent_log';
      data: {
        role: AgentRole;
        message: string;
        timestamp: Date;
        metadata?: Record<string, unknown>;
      };
    };
