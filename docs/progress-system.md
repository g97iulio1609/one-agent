# Progress System Reference

SDK 4.2 introduces a flexible progress tracking system that supports both AI-driven and weight-based progress distribution.

## Overview

The progress system provides real-time feedback during agent execution. It supports:

1. **AI-Driven Progress** - The AI reports progress via `_progress` field
2. **Weighted Fallback** - Automatic progress based on step weights
3. **Range Mapping** - Worker progress maps to manager's progress range

---

## Configuration

Configure progress in `agent.json`:

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

### Fields

| Field           | Type                  | Default | Description                     |
| :-------------- | :-------------------- | :------ | :------------------------------ |
| `aiDriven`      | `boolean`             | `true`  | Expect AI to report `_progress` |
| `fallbackSteps` | `AgentProgressStep[]` | `[]`    | Steps for fallback/UI display   |

### AgentProgressStep

| Field    | Type     | Description                        |
| :------- | :------- | :--------------------------------- |
| `name`   | `string` | Human-readable step description    |
| `weight` | `number` | Relative weight (sum should = 100) |

---

## AI-Driven Progress

When `aiDriven: true`, the AI is expected to include a `_progress` field in its responses:

```json
{
  "_progress": {
    "percent": 45,
    "message": "Analyzing user preferences..."
  },
  "analysis": { ... }
}
```

### \_progress Schema

```typescript
interface ProgressField {
  percent: number; // 0-100
  message?: string; // Optional status message
}
```

### Instructing the AI

Include progress instructions in your AGENTS.md:

````markdown
## Progress Reporting

As you work, report your progress using the `_progress` field:

```json
{
  "_progress": {
    "percent": 50,
    "message": "Halfway through analysis..."
  }
}
```
````

Report progress at meaningful milestones, not every response.

````

---

## Fallback Steps

When the AI doesn't report `_progress`, the system uses `fallbackSteps`:

```json
{
  "progress": {
    "aiDriven": true,
    "fallbackSteps": [
      { "name": "Parsing request", "weight": 10 },
      { "name": "Searching flights", "weight": 60 },
      { "name": "Ranking results", "weight": 20 },
      { "name": "Formatting output", "weight": 10 }
    ]
  }
}
````

The system displays these steps sequentially with estimated timing based on weights.

---

## Workflow Weight System

For manager agents with WORKFLOW.md, each step has a `weight`:

````yaml
## 1. Initial Analysis
```yaml
parallel:
  weight: 20
  steps:
    - call: workers/analyzer
    - call: workers/planner
````

## 2. Generate Content

```yaml
call: workers/generator
weight: 60
```

## 3. Validate

```yaml
call: workers/validator
weight: 20
```

```

### Progress Range Calculation

The SDK calculates progress ranges based on weights:

| Step | Weight | Progress Range |
|:-----|:------:|:---------------|
| Initial Analysis | 20 | 10% - 26% |
| Generate Content | 60 | 26% - 74% |
| Validate | 20 | 74% - 90% |

Note: 0-10% reserved for initialization, 90-100% for finalization.

### Formula

```

stepStart = PROGRESS_START + (cumulativeWeight / totalWeight) _ (PROGRESS_END - PROGRESS_START)
stepEnd = stepStart + (stepWeight / totalWeight) _ (PROGRESS_END - PROGRESS_START)

Where:
PROGRESS_START = 10
PROGRESS_END = 90

````

---

## Progress Range Mapping

When a worker runs within a manager workflow, its progress maps to the step's range.

### Example

Manager workflow step has range `30% - 60%`:

```yaml
call: workers/generator
weight: 40  # Maps to 30-60%
````

Worker reports `_progress: { percent: 50 }`:

```
Mapped progress = 30 + (50/100) * (60-30) = 45%
```

The user sees `45%` progress, not `50%`.

### Implementation

```typescript
function mapProgressToRange(localProgress: number, range: { start: number; end: number }): number {
  const { start, end } = range;
  return Math.round(start + (localProgress / 100) * (end - start));
}
```

---

## Manager vs Worker Configuration

### Manager (Orchestrator)

Managers typically use weight-based progress from WORKFLOW.md:

```json
{
  "progress": {
    "aiDriven": false,
    "fallbackSteps": [
      { "name": "Initial analysis", "weight": 20 },
      { "name": "Content generation", "weight": 60 },
      { "name": "Validation", "weight": 20 }
    ]
  }
}
```

- `aiDriven: false` because manager doesn't generate content
- `fallbackSteps` match WORKFLOW.md for UI display

### Worker (Executor)

Workers use AI-driven progress:

```json
{
  "progress": {
    "aiDriven": true,
    "fallbackSteps": [
      { "name": "Analyzing input", "weight": 30 },
      { "name": "Generating content", "weight": 50 },
      { "name": "Formatting output", "weight": 20 }
    ]
  }
}
```

- `aiDriven: true` expects AI to report progress
- `fallbackSteps` used if AI doesn't report

---

## Progress Events

The SDK emits progress events during execution:

```typescript
interface ProgressEvent {
  type: 'progress';
  data: {
    id: string; // Step identifier
    message: string; // Human-readable message
    percent: number; // 0-100
    iconHint?: string; // UI icon suggestion
  };
}
```

### Icon Hints

| Icon       | Use Case             |
| :--------- | :------------------- |
| `analyze`  | Analysis, reasoning  |
| `generate` | Content generation   |
| `validate` | Validation, checking |
| `search`   | Searching, querying  |
| `process`  | Data processing      |
| `complete` | Finalization         |

---

## Best Practices

### 1. Match Weights to Actual Duration

```json
// If search takes 60% of time, give it 60% weight
{
  "fallbackSteps": [
    { "name": "Parse query", "weight": 10 },
    { "name": "Search database", "weight": 60 },
    { "name": "Format results", "weight": 30 }
  ]
}
```

### 2. Keep Steps Coarse-Grained

```json
// Good - 3-6 meaningful steps
{
  "fallbackSteps": [
    { "name": "Analyze", "weight": 25 },
    { "name": "Generate", "weight": 50 },
    { "name": "Validate", "weight": 25 }
  ]
}

// Bad - too granular
{
  "fallbackSteps": [
    { "name": "Step 1", "weight": 5 },
    { "name": "Step 2", "weight": 5 },
    // ... 20 more steps
  ]
}
```

### 3. Report Progress at Milestones

```markdown
## Progress Reporting

Report progress at key milestones:

- 25%: Analysis complete
- 50%: First draft ready
- 75%: Refinements done
- 100%: Final output

Do NOT report progress on every response.
```

### 4. Ensure Weights Sum to 100

```json
{
  "fallbackSteps": [
    { "name": "Step 1", "weight": 30 },
    { "name": "Step 2", "weight": 40 },
    { "name": "Step 3", "weight": 30 }
  ]
  // Total: 30 + 40 + 30 = 100 ✓
}
```

### 5. Sync WORKFLOW.md and fallbackSteps

For managers, keep them aligned:

**WORKFLOW.md:**

```yaml
## 1. Analyze (weight: 20)
## 2. Generate (weight: 60)
## 3. Validate (weight: 20)
```

**agent.json:**

```json
{
  "progress": {
    "fallbackSteps": [
      { "name": "Analyze", "weight": 20 },
      { "name": "Generate", "weight": 60 },
      { "name": "Validate", "weight": 20 }
    ]
  }
}
```
