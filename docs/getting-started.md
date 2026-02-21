# Getting Started with OneAgent SDK 4.2

This guide walks you through creating your first agent workflow.

## Prerequisites

- Node.js 20+
- pnpm 10+
- TypeScript 5.4+

## Installation

```bash
pnpm add @onecoach/one-agent
```

## Basic Concepts

### Agents

An **Agent** is a self-contained AI unit with:

- **Configuration** (`agent.json`) - Identity, interface, and execution settings
- **Skills** - Reusable prompt templates (Markdown files)
- **Tools** - Functions the AI can call
- **Workflow** (optional) - Multi-step orchestration for manager agents

### Agent Types

| Type        | Description                                   | Has Workers |
| :---------- | :-------------------------------------------- | :---------: |
| **Worker**  | Single-purpose agent that completes one task  |     No      |
| **Manager** | Orchestrates multiple workers via WORKFLOW.md |     Yes     |

## Your First Agent

### 1. Create Directory Structure

```
my-agent/
├── agent.json       # Configuration
├── schema.ts        # Input/Output schemas
├── AGENTS.md        # System prompt
└── skills/          # Optional skill files
    └── example.skill.md
```

### 2. Define Configuration

**agent.json**

```json
{
  "id": "my-first-agent",
  "version": "1.0.0",
  "type": "agent",
  "description": "A simple agent that greets users",
  "interface": {
    "input": { "$ref": "./schema.ts#InputSchema" },
    "output": { "$ref": "./schema.ts#OutputSchema" }
  },
  "mcpServers": {},
  "skills": {
    "path": "skills",
    "expose": []
  },
  "tools": {
    "source": "registry",
    "allowlist": []
  },
  "progress": {
    "aiDriven": true,
    "fallbackSteps": [{ "name": "Processing request", "weight": 100 }]
  },
  "config": {
    "tier": "fast",
    "temperature": 1,
    "maxSteps": 10,
    "timeout": 60000,
    "executionMode": "durable"
  }
}
```

### 3. Define Schemas

**schema.ts**

```typescript
import { z } from 'zod';

export const InputSchema = z.object({
  name: z.string().describe('User name to greet'),
});

export const OutputSchema = z.object({
  greeting: z.string().describe('The personalized greeting'),
});

export type Input = z.infer<typeof InputSchema>;
export type Output = z.infer<typeof OutputSchema>;
```

### 4. Create System Prompt

**AGENTS.md**

```markdown
# My First Agent

You are a friendly greeting agent.

## Instructions

1. Read the user's name from input
2. Generate a warm, personalized greeting
3. Return the greeting in the specified format

## Output Format

Return JSON with a `greeting` field containing the personalized message.
```

### 5. Run the Agent

```typescript
import { runAgent } from '@onecoach/one-agent';

const result = await runAgent({
  agentPath: './my-agent',
  input: { name: 'Alice' },
});

console.log(result.output);
// { greeting: "Hello Alice! Welcome!" }
```

## Creating a Manager Agent

For complex workflows, create a manager that orchestrates workers.

### Directory Structure

```
workout-generation/
├── agent.json
├── schema.ts
├── AGENTS.md
├── WORKFLOW.md         # Orchestration logic
├── transforms/         # Pure functions
│   └── index.ts
└── workers/
    ├── planner/
    │   ├── agent.json
    │   └── schema.ts
    └── validator/
        ├── agent.json
        └── schema.ts
```

### WORKFLOW.md Example

````yaml
# Workout Generation Workflow

## 1. Plan Workout
```yaml
call: workers/planner
weight: 60
input:
  goals: ${input.goals}
store: plan
````

## 2. Validate Plan

```yaml
call: workers/validator
weight: 40
input:
  plan: ${artifacts.plan}
store: validatedPlan
```

```

## Next Steps

- Read [Agent Configuration](./agent-configuration.md) for full `agent.json` reference
- Learn [Workflow DSL](./workflow-dsl.md) for complex orchestrations
- Explore [Skills & Tools](./skills-and-tools.md) for extending capabilities
```
