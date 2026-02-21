# Architecture Overview

This document describes the internal architecture of the OneAgent SDK 4.2.

## Core Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                          OneAgent SDK                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   Loader    │  │   Worker    │  │  Workflow   │  │   Types    │ │
│  │  loader.ts  │  │  worker.ts  │  │ workflow.ts │  │  types.ts  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         │                │                │                │        │
│         ▼                ▼                ▼                ▼        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                         Agent Runtime                          │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │ │
│  │  │ Manifest │ │  Skills  │ │  Tools   │ │     Progress     │  │ │
│  │  │  Parser  │ │  Loader  │ │  Loader  │ │  Range Mapper    │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Responsibilities

### loader.ts

Responsible for loading agent configurations and resources.

```typescript
// Key exports
export function loadAgentManifest(path: string): Promise<AgentManifest>;
export function loadAgentJsonConfig(path: string): Promise<AgentJsonConfig>;
export function loadAgentSkills(path: string): Promise<Skill[]>;
export function loadSkills(path: string): Promise<Skill[]>;
```

**Features:**

- Parses `agent.json` configuration
- Loads skills from filesystem (`.skill.md` files)
- Handles skill visibility/exposure for parent-child relationships
- Validates configuration against schemas

### worker.ts

Implements the Worker pattern for single-agent execution.

```typescript
// Key exports
export function runWorker(params: WorkerParams): Promise<WorkerResult>;
```

**Features:**

- Executes single agents with LLM
- Handles tool calling loop
- Manages progress reporting
- Supports OAuth providers (e.g., `gemini-cli`)

### workflow.ts

Implements the Manager pattern for multi-agent orchestration.

```typescript
// Key exports
export function runAgentWorkflow(params: WorkflowParams): Promise<WorkflowResult>;
```

**Features:**

- Parses WORKFLOW.md DSL
- Executes workflow steps (call, parallel, loop, conditional, transform)
- Manages artifacts between steps
- Distributes progress based on weights

### types.ts

Contains all TypeScript type definitions.

```typescript
// SDK 4.2 New Types
export interface AgentSkillsConfig {
  path?: string;
  expose?: string[];
}
export interface AgentToolsConfig {
  source?: 'registry' | 'mcp';
  allowlist?: string[];
}
export interface AgentProgressConfig {
  aiDriven?: boolean;
  fallbackSteps?: AgentProgressStep[];
}
export interface AgentProgressStep {
  name: string;
  weight: number;
}
export const OAUTH_PROVIDERS = ['gemini-cli'] as const;
```

---

## Execution Flow

### Worker Execution

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Input   │───▶│  Worker  │───▶│   LLM    │───▶│  Output  │
└──────────┘    └────┬─────┘    └────┬─────┘    └──────────┘
                     │               │
                     ▼               ▼
               ┌──────────┐    ┌──────────┐
               │  Skills  │    │  Tools   │
               │ (context)│    │ (actions)│
               └──────────┘    └──────────┘
```

1. **Load** - Parse agent.json, load skills/tools
2. **Prepare** - Build system prompt with skills
3. **Execute** - LLM reasoning loop with tool calls
4. **Report** - Stream progress updates
5. **Return** - Parse and validate output

### Workflow Execution

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Input   │───▶│ Workflow │───▶│  Output  │
└──────────┘    └────┬─────┘    └──────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  Step 1 │  │  Step 2 │  │  Step N │
   │ (call)  │  │(parallel)│  │(transform)│
   └────┬────┘  └────┬────┘  └────┬────┘
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Worker  │  │ Workers │  │Function │
   └─────────┘  └─────────┘  └─────────┘
```

1. **Parse** - Read WORKFLOW.md, parse steps
2. **Calculate Ranges** - Compute progress ranges from weights
3. **Execute Steps** - Run each step sequentially
4. **Store Artifacts** - Save outputs for subsequent steps
5. **Synthesize** - Combine results (or use outputArtifact)

---

## Progress Range Mapping

### Problem

Workers report progress 0-100%, but manager needs to map this to the step's allocated range.

### Solution

```typescript
function mapProgressToRange(localProgress: number, range: { start: number; end: number }): number {
  const { start, end } = range;
  return Math.round(start + (localProgress / 100) * (end - start));
}
```

### Example

```
Workflow Steps:
  Step 1 (weight: 20) → Range: 10-26%
  Step 2 (weight: 60) → Range: 26-74%
  Step 3 (weight: 20) → Range: 74-90%

When Step 2's worker reports 50% progress:
  Mapped = 26 + (50/100) * (74-26) = 26 + 24 = 50%

User sees: "50% complete"
```

---

## Skill Visibility System

### Design Goals

1. **Secure by default** - Skills private unless exposed
2. **Explicit visibility** - Parent must explicitly access child skills
3. **Namespacing** - Prevent skill name collisions

### Implementation

```typescript
// Child agent exposes skills
{
  "skills": {
    "path": "skills",
    "expose": ["analysis"]
  }
}

// Parent agent sees:
// - Own skills: "my-skill"
// - Child skills: "child-agent:analysis"
```

### Loading Flow

```
loadAgentSkills(managerPath)
  ├── Load manager's own skills
  ├── For each child agent in workers/
  │   ├── Load child's agent.json
  │   ├── Check skills.expose array
  │   └── Load exposed skills with namespace prefix
  └── Return combined skill set
```

---

## Durable Execution

### Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Workflow Execution                   │
├────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Step 1  │──│Checkpoint│──│  Step 2  │──...        │
│  └──────────┘  └──────────┘  └──────────┘             │
│        ▲                           │                   │
│        │         On Failure        │                   │
│        └───────────────────────────┘                   │
│              (Resume from checkpoint)                   │
└────────────────────────────────────────────────────────┘
```

### Features

- **Checkpointing** - Save state after each step
- **Retry** - Exponential backoff on failures
- **Resume** - Continue from last checkpoint
- **Timeout** - Configurable max duration

### Configuration

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

---

## Type System

### Core Types Hierarchy

```
AgentManifest
├── id: string
├── version: string
├── type: 'agent'
├── description: string
├── interface: AgentInterface
├── mcpServers: Record<string, McpServerConfig>
├── skills: AgentSkillsConfig        # SDK 4.2
├── tools: AgentToolsConfig          # SDK 4.2
├── progress: AgentProgressConfig    # SDK 4.2
├── config: AgentConfig
└── workflow?: WorkflowDefinition

WorkflowStep (union type)
├── CallStep { call, weight, input, store }
├── ParallelStep { parallel, weight, steps }
├── LoopStep { loop, weight, over, steps, ... }
├── ConditionalStep { conditional, weight, condition, then, else }
└── TransformStep { transform, weight, input, store }
```

### SDK 4.2 New Types

```typescript
// Skills configuration
interface AgentSkillsConfig {
  path?: string; // Default: "skills"
  expose?: string[]; // Default: [] (private)
}

// Tools configuration
interface AgentToolsConfig {
  source?: 'registry' | 'mcp'; // Default: "registry"
  allowlist?: string[]; // Default: [] (all)
}

// Progress configuration
interface AgentProgressConfig {
  aiDriven?: boolean; // Default: true
  fallbackSteps?: AgentProgressStep[];
}

interface AgentProgressStep {
  name: string;
  weight: number;
}

// OAuth providers
const OAUTH_PROVIDERS = ['gemini-cli'] as const;
type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
```

---

## Design Principles

### 1. Declarative Over Imperative

Workflows are defined declaratively in WORKFLOW.md, not in code:

```yaml
# Declarative ✓
call: workers/planner
weight: 30
input:
  goals: ${input.goals}
store: plan
```

### 2. Composition Over Inheritance

Agents compose through workflows, not inheritance:

```
Manager
├── call: worker-1
├── call: worker-2
└── call: worker-3
```

### 3. Explicit Over Implicit

Configuration is explicit:

```json
{
  "skills": { "path": "skills", "expose": [] },
  "tools": { "source": "registry", "allowlist": [] },
  "progress": { "aiDriven": true, "fallbackSteps": [] }
}
```

### 4. Secure by Default

- Skills private by default
- Tools require explicit allowlist
- Durable execution for fault tolerance

### 5. Progressive Complexity

Simple agents need minimal config:

```json
{
  "id": "simple-agent",
  "version": "1.0.0",
  "type": "agent",
  "description": "Simple agent",
  "interface": { ... },
  "config": { "tier": "fast" }
}
```

Complex agents add more:

```json
{
  "id": "complex-agent",
  "skills": { ... },
  "tools": { ... },
  "progress": { ... },
  "config": { "durability": { ... } }
}
```
