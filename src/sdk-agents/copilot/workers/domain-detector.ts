/**
 * Domain Detector Worker
 * 
 * SDK 3.1 worker that detects the domain from a user query.
 */
import { z } from 'zod';

// ============================================================================
// Worker Schema
// ============================================================================

export const DomainDetectorInputSchema = z.object({
  query: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
});

export const DomainDetectorOutputSchema = z.object({
  domain: z.enum(['nutrition', 'workout', 'flight', 'oneagenda', 'general']),
  confidence: z.number(),
  reasoning: z.string(),
});

// ============================================================================
// Worker AGENTS.md Content (inline)
// ============================================================================

export const DOMAIN_DETECTOR_PROMPT = `
# Domain Detection Agent

You analyze user queries to determine which domain they belong to.

## Domains

| Domain | Keywords | Description |
|--------|----------|-------------|
| nutrition | meal, calorie, protein, diet, food, eat, macro, carb, fat, recipe | Food and nutrition planning |
| workout | exercise, workout, training, gym, sets, reps, muscle, strength, cardio | Exercise and fitness |
| flight | flight, fly, airport, travel, ticket, airline, booking, volo, aereo | Flight search and travel |
| oneagenda | task, project, schedule, deadline, milestone, habit, todo, agenda | Productivity and tasks |
| general | everything else | General conversation |

## Instructions

1. Analyze the query for domain-specific keywords
2. Consider the context if provided
3. Return the most likely domain with confidence score
4. If uncertain, default to "general"

## Output Format

Return JSON:
{
  "domain": "nutrition|workout|flight|oneagenda|general",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}
`;
