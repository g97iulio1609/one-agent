# One-Agent - Agent Guide

> **Meta**: AI Agent framework for OneCoach. Defines how agents are constructed, communicate, and interact with tools and the world.

## Quick Reference

| Attribute   | Value                                                     |
| :---------- | :-------------------------------------------------------- |
| **Package** | `@onecoach/one-agent`                                     |
| **Purpose** | Agent definitions, tool system, inter-agent communication |
| **Pattern** | Agent Mesh architecture                                   |

---

## Directory Structure

```
submodules/one-agent/
├── agents/            # Concrete agent implementations
│   ├── coach/         # Coach agent
│   ├── nutritionist/  # Nutrition agent
│   └── trainer/       # Workout agent
├── core/              # Base classes, interfaces
│   ├── agent.ts       # Base Agent class
│   ├── tool.ts        # Tool definition interface
│   └── message.ts     # Message types
├── mesh/              # Inter-agent communication
├── adapters/          # External service adapters (LLM, DB)
├── registry/          # Agent discovery & lifecycle
└── schemas/           # Zod schemas for structured output
```

---

## Key Concepts

### Agent

Base unit of AI capability. Extends `Agent` class:

```typescript
import { Agent, Tool } from '@onecoach/one-agent';

class NutritionAgent extends Agent {
  name = 'nutrition-agent';
  description = 'Plans meals and calculates macros';

  tools: Tool[] = [calculateMacrosTool, generateMealPlanTool];
}
```

### Tool

Capabilities exposed to LLMs:

```typescript
import { defineTool } from '@onecoach/one-agent';

const calculateMacrosTool = defineTool({
  name: 'calculate_macros',
  description: 'Calculate macronutrients for a food item',
  parameters: z.object({
    foodId: z.string(),
    quantity: z.number(),
  }),
  execute: async ({ foodId, quantity }) => {
    // Implementation
  },
});
```

### Agent Mesh

System for inter-agent communication:

```typescript
import { AgentMesh } from '@onecoach/one-agent';

const mesh = new AgentMesh();
mesh.register(nutritionAgent);
mesh.register(workoutAgent);

// Agents can now message each other
await mesh.send('nutrition-agent', 'workout-agent', message);
```

---

## Navigation Guide

| Task                 | Location                                     |
| :------------------- | :------------------------------------------- |
| Add new agent        | `agents/`                                    |
| Define new tool      | Create in agent directory, register in agent |
| Modify base Agent    | `core/agent.ts`                              |
| Add external adapter | `adapters/`                                  |
| Agent lifecycle      | `registry/`                                  |
| Agent communication  | `mesh/`                                      |
