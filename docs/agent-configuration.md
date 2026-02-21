# Agent Configuration Reference

Complete reference for `agent.json` configuration in SDK 4.2.

## Full Schema

```json
{
  "id": "agent-id",
  "version": "1.0.0",
  "type": "agent",
  "description": "Agent description",
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
    "fallbackSteps": [{ "name": "Step name", "weight": 100 }]
  },
  "config": {
    "tier": "balanced",
    "temperature": 1,
    "maxSteps": 15,
    "maxTokens": 8192,
    "timeout": 120000,
    "executionMode": "durable",
    "skipSynthesis": false,
    "outputArtifact": "finalOutput",
    "durability": {
      "enabled": true,
      "maxDurationMs": 600000,
      "retry": {
        "maxAttempts": 3,
        "backoffMs": 1000,
        "backoffMultiplier": 2
      },
      "checkpointStrategy": "step"
    }
  }
}
```

## Field Reference

### Root Fields

| Field         | Type                  | Required | Description                      |
| :------------ | :-------------------- | :------: | :------------------------------- |
| `id`          | `string`              |   Yes    | Unique identifier (kebab-case)   |
| `version`     | `string`              |   Yes    | Semantic version (e.g., "2.1.0") |
| `type`        | `"agent"`             |   Yes    | Always "agent"                   |
| `description` | `string`              |   Yes    | Human-readable description       |
| `interface`   | `object`              |   Yes    | Input/output schema references   |
| `mcpServers`  | `object`              |    No    | MCP server configurations        |
| `skills`      | `AgentSkillsConfig`   |    No    | Skills configuration (SDK 4.2+)  |
| `tools`       | `AgentToolsConfig`    |    No    | Tools configuration (SDK 4.2+)   |
| `progress`    | `AgentProgressConfig` |    No    | Progress tracking (SDK 4.2+)     |
| `config`      | `AgentConfig`         |   Yes    | Execution configuration          |

---

### interface

Defines the agent's input and output contract.

```json
{
  "interface": {
    "input": { "$ref": "./schema.ts#InputSchema" },
    "output": { "$ref": "./schema.ts#OutputSchema" }
  }
}
```

| Field         | Type     | Description                    |
| :------------ | :------- | :----------------------------- |
| `input.$ref`  | `string` | Reference to input Zod schema  |
| `output.$ref` | `string` | Reference to output Zod schema |

---

### skills (SDK 4.2+)

Configures skill file loading and visibility.

```json
{
  "skills": {
    "path": "skills",
    "expose": ["skill-name"]
  }
}
```

| Field    | Type       | Default    | Description                       |
| :------- | :--------- | :--------- | :-------------------------------- |
| `path`   | `string`   | `"skills"` | Relative path to skills directory |
| `expose` | `string[]` | `[]`       | Skills visible to parent managers |

**Visibility Rules:**

- By default, skills are **private** to the agent
- Listed skills in `expose` become visible to parent managers
- Parent managers see exposed skills as `{agentId}:{skillName}`

---

### tools (SDK 4.2+)

Configures tool availability for the agent.

```json
{
  "tools": {
    "source": "registry",
    "allowlist": ["tool-1", "tool-2"]
  }
}
```

| Field       | Type                  | Default      | Description                      |
| :---------- | :-------------------- | :----------- | :------------------------------- |
| `source`    | `"registry" \| "mcp"` | `"registry"` | Where tools come from            |
| `allowlist` | `string[]`            | `[]`         | Allowed tool names (empty = all) |

**Source Types:**

- `"registry"` - Tools from the internal tool registry
- `"mcp"` - Tools from configured MCP servers

---

### progress (SDK 4.2+)

Configures progress tracking behavior.

```json
{
  "progress": {
    "aiDriven": true,
    "fallbackSteps": [
      { "name": "Analyzing input", "weight": 30 },
      { "name": "Processing data", "weight": 50 },
      { "name": "Generating output", "weight": 20 }
    ]
  }
}
```

| Field           | Type                  | Default | Description                     |
| :-------------- | :-------------------- | :------ | :------------------------------ |
| `aiDriven`      | `boolean`             | `true`  | Expect AI to report `_progress` |
| `fallbackSteps` | `AgentProgressStep[]` | `[]`    | Fallback if AI doesn't report   |

**AgentProgressStep:**

| Field    | Type     | Description                         |
| :------- | :------- | :---------------------------------- |
| `name`   | `string` | Step description (shown to user)    |
| `weight` | `number` | Relative weight (should sum to 100) |

---

### config

Execution and runtime configuration.

```json
{
  "config": {
    "tier": "balanced",
    "temperature": 1,
    "maxSteps": 15,
    "maxTokens": 8192,
    "timeout": 120000,
    "executionMode": "durable",
    "skipSynthesis": false,
    "outputArtifact": "result",
    "durability": { ... }
  }
}
```

| Field            | Type      | Default      | Description                                      |
| :--------------- | :-------- | :----------- | :----------------------------------------------- |
| `tier`           | `string`  | `"balanced"` | Model tier: `"fast"`, `"balanced"`, `"powerful"` |
| `temperature`    | `number`  | `1`          | Sampling temperature (0-2)                       |
| `maxSteps`       | `number`  | `15`         | Maximum LLM turns                                |
| `maxTokens`      | `number`  | `8192`       | Max output tokens per turn                       |
| `timeout`        | `number`  | `120000`     | Timeout in milliseconds                          |
| `executionMode`  | `string`  | `"durable"`  | `"standard"` or `"durable"`                      |
| `skipSynthesis`  | `boolean` | `false`      | Skip final synthesis (managers)                  |
| `outputArtifact` | `string`  | -            | Artifact key to use as output                    |
| `durability`     | `object`  | -            | Durable execution settings                       |

---

### config.durability

Durable execution configuration for fault-tolerant workflows.

```json
{
  "durability": {
    "enabled": true,
    "maxDurationMs": 600000,
    "retry": {
      "maxAttempts": 3,
      "backoffMs": 1000,
      "backoffMultiplier": 2
    },
    "checkpointStrategy": "step"
  }
}
```

| Field                     | Type      | Default  | Description                    |
| :------------------------ | :-------- | :------- | :----------------------------- |
| `enabled`                 | `boolean` | `true`   | Enable durable execution       |
| `maxDurationMs`           | `number`  | `600000` | Max workflow duration (10min)  |
| `retry.maxAttempts`       | `number`  | `3`      | Retry attempts per step        |
| `retry.backoffMs`         | `number`  | `1000`   | Initial backoff delay          |
| `retry.backoffMultiplier` | `number`  | `2`      | Exponential backoff multiplier |
| `checkpointStrategy`      | `string`  | `"step"` | When to checkpoint             |

---

## Model Tiers

| Tier       | Use Case                 | Speed  |  Cost  |
| :--------- | :----------------------- | :----: | :----: |
| `fast`     | Simple tasks, validation |  High  |  Low   |
| `balanced` | General purpose          | Medium | Medium |
| `powerful` | Complex reasoning        |  Low   |  High  |

---

## Example Configurations

### Simple Worker

```json
{
  "id": "validator",
  "version": "2.1.0",
  "type": "agent",
  "description": "Validates data against rules",
  "interface": {
    "input": { "$ref": "./schema.ts#ValidatorInput" },
    "output": { "$ref": "./schema.ts#ValidatorOutput" }
  },
  "skills": { "path": "skills", "expose": [] },
  "tools": { "source": "registry", "allowlist": [] },
  "progress": {
    "aiDriven": true,
    "fallbackSteps": [{ "name": "Validating", "weight": 100 }]
  },
  "config": {
    "tier": "fast",
    "temperature": 1,
    "maxSteps": 5,
    "timeout": 30000
  }
}
```

### Manager with Workflow

```json
{
  "id": "workout-generation",
  "version": "2.1.0",
  "type": "agent",
  "description": "Multi-agent workout generator",
  "interface": {
    "input": { "$ref": "./schema.ts#WorkoutInput" },
    "output": { "$ref": "./schema.ts#WorkoutOutput" }
  },
  "mcpServers": {},
  "skills": { "path": "skills", "expose": [] },
  "tools": { "source": "registry", "allowlist": [] },
  "progress": {
    "aiDriven": false,
    "fallbackSteps": [
      { "name": "Initial analysis", "weight": 20 },
      { "name": "Planning workout", "weight": 30 },
      { "name": "Generating days", "weight": 35 },
      { "name": "Validation", "weight": 15 }
    ]
  },
  "config": {
    "tier": "balanced",
    "maxSteps": 50,
    "timeout": 600000,
    "executionMode": "durable",
    "skipSynthesis": true,
    "outputArtifact": "finalProgram",
    "durability": {
      "enabled": true,
      "maxDurationMs": 1800000,
      "retry": { "maxAttempts": 5, "backoffMs": 2000, "backoffMultiplier": 2 },
      "checkpointStrategy": "step"
    }
  }
}
```

### Agent with MCP Tools

```json
{
  "id": "flight-search",
  "version": "1.1.0",
  "type": "agent",
  "description": "Search and book flights",
  "interface": {
    "input": { "$ref": "./schema.ts#FlightSearchInput" },
    "output": { "$ref": "./schema.ts#FlightSearchOutput" }
  },
  "mcpServers": {
    "kiwi": {
      "command": "npx",
      "args": ["-y", "@kiwi/mcp-server"]
    }
  },
  "skills": {
    "path": "skills",
    "expose": ["price-analysis", "recommendation"]
  },
  "tools": {
    "source": "mcp",
    "allowlist": ["kiwi_search", "kiwi_book"]
  },
  "progress": {
    "aiDriven": true,
    "fallbackSteps": [
      { "name": "Parsing request", "weight": 10 },
      { "name": "Searching flights", "weight": 60 },
      { "name": "Ranking results", "weight": 20 },
      { "name": "Formatting output", "weight": 10 }
    ]
  },
  "config": {
    "tier": "balanced",
    "maxSteps": 20,
    "timeout": 180000
  }
}
```
