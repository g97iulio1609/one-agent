# OneAgent SDK Documentation

> **Version 4.2.0** - Multi-Agent Workflow Framework

Welcome to the OneAgent SDK documentation. This SDK provides a declarative, durable, and type-safe framework for building AI agent workflows.

## Documentation Index

| Document                                        | Description                                |
| :---------------------------------------------- | :----------------------------------------- |
| [Getting Started](./getting-started.md)         | Quick start guide and basic concepts       |
| [Agent Configuration](./agent-configuration.md) | Complete `agent.json` reference            |
| [Workflow DSL](./workflow-dsl.md)               | Workflow primitives and WORKFLOW.md syntax |
| [Skills & Tools](./skills-and-tools.md)         | Skill definitions and tool configuration   |
| [Progress System](./progress-system.md)         | AI-driven and weighted progress tracking   |
| [Migration Guide](./migration-guide.md)         | Upgrading from SDK 4.0/4.1 to 4.2          |

## What's New in 4.2

### Key Features

- **Weighted Progress Distribution** - Allocate progress based on step complexity
- **Skill Visibility System** - Secure-by-default skill exposure between agents
- **Enhanced Tools Configuration** - Registry and MCP source support with allowlists
- **AI-Driven Progress** - Let the AI report progress naturally with fallback support

### Breaking Changes

See the [Migration Guide](./migration-guide.md) for detailed upgrade instructions.

## Quick Example

```json
{
  "id": "my-agent",
  "version": "1.0.0",
  "type": "agent",
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
    "fallbackSteps": [
      { "name": "Step 1", "weight": 50 },
      { "name": "Step 2", "weight": 50 }
    ]
  }
}
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Manager Agent                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    WORKFLOW.md                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  │   │
│  │  │transform│→ │  call   │→ │  loop   │→ │parallel│  │   │
│  │  │ (sync)  │  │ (worker)│  │(workers)│  │(workers)│  │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Workers/                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ worker-1 │  │ worker-2 │  │ worker-n │           │   │
│  │  │agent.json│  │agent.json│  │agent.json│           │   │
│  │  └──────────┘  └──────────┘  └──────────┘           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## License

MIT - OneCoach Platform
