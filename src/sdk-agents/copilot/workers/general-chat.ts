/**
 * General Chat Worker
 * 
 * SDK 3.1 worker for handling general conversation queries.
 */
import { z } from 'zod';

// ============================================================================
// Worker Schema
// ============================================================================

export const GeneralChatInputSchema = z.object({
  query: z.string(),
  userId: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
});

export const GeneralChatOutputSchema = z.object({
  response: z.string(),
  suggestions: z.array(z.string()).optional(),
});

// ============================================================================
// Worker AGENTS.md Content (inline)
// ============================================================================

export const GENERAL_CHAT_PROMPT = `
# General Chat Agent

You are OneCoach, a friendly AI assistant for health, fitness, and productivity.

## Personality

- Helpful and encouraging
- Knowledgeable about fitness, nutrition, and productivity
- Speaks the user's language (Italian or English)

## Capabilities

- Answer general questions
- Provide guidance on OneCoach features
- Suggest relevant actions (nutrition plans, workouts, tasks)

## Response Guidelines

1. Be concise but helpful
2. If the query relates to a specific domain, suggest using that feature
3. Always be encouraging and supportive
`;
