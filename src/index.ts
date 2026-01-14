/**
 * OneAgent SDK 2.5
 *
 * Native AI agent framework for onecoach
 * Following KISS, DRY, and SOLID principles
 *
 * @packageDocumentation
 */

// Core
export * from './core/types';
export * from './core/type-helpers';
export * from './core/BaseAgent';
export * from './core/CostCalculator';

// Re-export core AI types
export { z } from 'zod';
export { streamText, Output } from 'ai';
export type { LanguageModel, UIMessage } from 'ai';

// Adapters
export * from './adapters/VercelAIProvider';
// AIProvider moved to @onecoach/lib-ai - import from there directly

// Schemas
export * from './schemas/nutrition.schema';
export * from './schemas/workout.schema';

// Mesh
export * from './mesh/types';
export { MeshAgent } from './mesh/MeshAgent';
export { MeshCoordinator, type CoordinatorConfig } from './mesh/MeshCoordinator';
export * from './mesh/PerformanceMonitor';
export * from './mesh/SimpleCache';

// Workout: LEGACY - WorkoutMeshCoordinator removed, now using SDK 3.1 via @onecoach/one-workout
// For workout generation, use generateWorkoutProgram from @onecoach/one-workout

// Food agents - LEGACY REMOVED: Now using SDK 3.1 via @onecoach/one-nutrition
// For food generation, use generateFoods from @onecoach/one-nutrition

// Shared prompt fragments for consistent AI instructions (still useful for other agents)
// export * from './agents/workout/SharedPromptFragments'; // REMOVED: Part of legacy workout module

// Workout types - explicit exports to avoid naming conflicts with workout.schema
export {
  // Constants
  STANDARD_MUSCLE_GROUPS,
  // Types
  type Logger,
  type Confidence,
  type VolumeLevel,
  type IntensityLevel,
  type LegacyMuscleGroup,
  type ExperienceLevel,
  type PrimaryGoal,
  type Goal,
  type TrainingPhase,
  type Phase,
  type SplitType,
  type ProgressionMethod,
  type WorkoutStatus,
  type WeightUnit,
  type SelectedExercise,
  type WeeklyStructure,
  type Mesocycle,
  type ProgramStructure,
  type ProgressionStrategy,
  type StartingWeight,
  type WeeklyProgression,
  type AutoRegulation,
  type PersonalizedTip,
  type PracticalAdvice,
  type ValidationIssue,
  type UserProfile,
  type WorkoutConstraints,
  type WorkoutPreferences,
  type OneRepMaxRecord,
  type WorkoutProgramMetadata,
  type WorkoutExerciseSet,
  type AthleteBrief,
  type AthleteProfile,
  type MacroPlan,
  type SessionBlueprint,
  type Week1Plan,
  type Week1Template,
  type WorkoutSession,
  type ExistingUserProfile,
  type BodyMeasurementHistory,
  type WorkoutHistory,
  type UserMaxes,
  type LastProgramContext,
  type NutritionContext,
  type UserMemoryContext,
  type WorkoutMeshContext,
  type WeekDiff,
  type LoadAnalysis,
  type QAReport,
  type EvaluationRubric,
} from './agents/workout/types';

// Copilot Agent (usa ChatAgent per i flussi moderni)
export * from './agents/copilot';

// Chat Agent (AI SDK v6 ToolLoopAgent)
export * from './agents/chat';

// Flight Search Agent - moved to @onecoach/lib-flight
// export * from './agents/flight';

// Agent Registry
export * from './registry';

// Utils
export * from './utils/ai-agent-setup';

// Version
export const VERSION = '2.7.0';
