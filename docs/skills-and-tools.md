# Skills & Tools Reference

Skills and tools extend agent capabilities beyond pure LLM reasoning.

## Skills

**Skills** are reusable prompt templates written in Markdown. They provide domain knowledge, instructions, or specialized behaviors that can be injected into agent prompts.

### Directory Structure

```
my-agent/
├── agent.json
├── skills/
│   ├── analysis.skill.md
│   ├── formatting.skill.md
│   └── validation.skill.md
```

### Skill File Format

**skills/analysis.skill.md**

````markdown
# Data Analysis Skill

## Purpose

Analyze structured data to extract insights and patterns.

## Instructions

1. Examine the data structure and identify key fields
2. Look for patterns, outliers, and trends
3. Summarize findings in a structured format

## Output Format

Return analysis as JSON:

```json
{
  "patterns": ["pattern 1", "pattern 2"],
  "outliers": [],
  "summary": "Brief summary of findings"
}
```
````

## Examples

### Example 1: Sales Data

**Input:**

```json
{ "sales": [100, 150, 120, 180, 200] }
```

**Analysis:**

```json
{
  "patterns": ["Upward trend in sales"],
  "outliers": [],
  "summary": "Sales show consistent growth of ~25% month-over-month"
}
```

````

### Naming Convention

- File: `{skill-name}.skill.md`
- Skill name: kebab-case (e.g., `price-analysis`)

---

## Skills Configuration (SDK 4.2+)

Configure skills in `agent.json`:

```json
{
  "skills": {
    "path": "skills",
    "expose": ["analysis", "formatting"]
  }
}
````

### Fields

| Field    | Type       | Default    | Description                       |
| :------- | :--------- | :--------- | :-------------------------------- |
| `path`   | `string`   | `"skills"` | Directory containing skill files  |
| `expose` | `string[]` | `[]`       | Skills visible to parent managers |

### Skill Visibility

By default, skills are **private** to the agent that defines them.

To make skills available to parent manager agents:

```json
{
  "skills": {
    "path": "skills",
    "expose": ["price-analysis", "recommendation"]
  }
}
```

When a manager loads a worker, exposed skills appear namespaced:

```
flight-search:price-analysis
flight-search:recommendation
```

---

## Tools

**Tools** are functions the AI can call to perform actions or retrieve data.

### Tool Sources

SDK 4.2 supports two tool sources:

| Source     | Description                    |
| :--------- | :----------------------------- |
| `registry` | Built-in tool registry         |
| `mcp`      | Model Context Protocol servers |

### Tools Configuration

```json
{
  "tools": {
    "source": "registry",
    "allowlist": ["search", "calculate"]
  }
}
```

### Fields

| Field       | Type                  | Default      | Description                 |
| :---------- | :-------------------- | :----------- | :-------------------------- |
| `source`    | `"registry" \| "mcp"` | `"registry"` | Where tools come from       |
| `allowlist` | `string[]`            | `[]`         | Allowed tools (empty = all) |

---

## Registry Tools

Define tools in `tools/tools.ts`:

```typescript
// tools/tools.ts
import { z } from 'zod';
import { defineTool } from '@onecoach/one-agent';

export const searchTool = defineTool({
  name: 'search',
  description: 'Search for information',
  parameters: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().optional().describe('Max results'),
  }),
  execute: async ({ query, limit = 10 }) => {
    const results = await performSearch(query, limit);
    return { results };
  },
});

export const calculateTool = defineTool({
  name: 'calculate',
  description: 'Perform mathematical calculation',
  parameters: z.object({
    expression: z.string().describe('Math expression'),
  }),
  execute: async ({ expression }) => {
    const result = evaluate(expression);
    return { result };
  },
});
```

### Tool Definition

| Field         | Type        | Description                  |
| :------------ | :---------- | :--------------------------- |
| `name`        | `string`    | Tool identifier              |
| `description` | `string`    | What the tool does (for LLM) |
| `parameters`  | `ZodSchema` | Input schema                 |
| `execute`     | `function`  | Implementation               |

---

## MCP Tools

Use tools from MCP (Model Context Protocol) servers.

### Configuration

```json
{
  "mcpServers": {
    "kiwi": {
      "command": "npx",
      "args": ["-y", "@kiwi/mcp-server"],
      "env": {
        "API_KEY": "${KIWI_API_KEY}"
      }
    }
  },
  "tools": {
    "source": "mcp",
    "allowlist": ["kiwi_search", "kiwi_book"]
  }
}
```

### MCP Server Options

| Field     | Type       | Description             |
| :-------- | :--------- | :---------------------- |
| `command` | `string`   | Command to start server |
| `args`    | `string[]` | Command arguments       |
| `env`     | `object`   | Environment variables   |

### Tool Allowlist

When using MCP, the `allowlist` filters available tools:

```json
{
  "tools": {
    "source": "mcp",
    "allowlist": ["kiwi_search"] // Only expose search, not book
  }
}
```

Empty allowlist = all tools available:

```json
{
  "tools": {
    "source": "mcp",
    "allowlist": [] // All MCP tools available
  }
}
```

---

## Combining Skills and Tools

Agents can use both skills and tools together:

```json
{
  "id": "flight-search",
  "skills": {
    "path": "skills",
    "expose": ["price-analysis", "recommendation"]
  },
  "tools": {
    "source": "mcp",
    "allowlist": ["kiwi_search", "kiwi_book"]
  }
}
```

### Skill for Analysis

**skills/price-analysis.skill.md**

```markdown
# Price Analysis Skill

Analyze flight prices to identify the best deals.

## Factors to Consider

- Price per mile
- Time of departure
- Number of stops
- Airline reputation

## Scoring

Rate each flight 1-10 based on value-for-money.
```

### Tool for Data

The agent uses the skill's knowledge to analyze results from the tool:

```
AI: I'll search for flights using kiwi_search
[calls kiwi_search tool]

AI: Now I'll apply price-analysis to rank these results
[uses price-analysis skill knowledge]

AI: Based on my analysis, here are the top 3 flights...
```

---

## Best Practices

### Skills

1. **Keep skills focused** - One skill = one capability
2. **Include examples** - Show expected input/output
3. **Use structured output** - Define JSON schemas
4. **Expose sparingly** - Only expose skills that parents need

### Tools

1. **Use allowlists** - Don't expose unnecessary tools
2. **Validate inputs** - Use Zod schemas
3. **Handle errors** - Return meaningful error messages
4. **Log calls** - Track tool usage for debugging

### Security

```json
{
  "skills": {
    "expose": [] // Secure by default
  },
  "tools": {
    "allowlist": ["safe_tool"] // Explicit allowlist
  }
}
```
