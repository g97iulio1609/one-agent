# Workflow DSL Reference

The Workflow DSL defines how manager agents orchestrate workers. Workflows are defined in `WORKFLOW.md` files using YAML code blocks.

## Overview

A workflow consists of **steps** that execute sequentially. Each step can:

- Call a worker agent (`call`)
- Run multiple workers in parallel (`parallel`)
- Loop over data (`loop`)
- Execute conditionally (`conditional`)
- Transform data synchronously (`transform`)

## Basic Syntax

````markdown
# My Workflow

## 1. Step Name

```yaml
call: workers/my-worker
weight: 30
input:
  data: ${input.data}
store: result
```
````

## 2. Another Step

```yaml
transform: processData
weight: 20
input:
  result: ${artifacts.result}
store: processed
```

````

## Step Types

### call

Invokes a single worker agent.

```yaml
call: workers/planner
weight: 40
input:
  goals: ${input.goals}
  preferences: ${input.preferences}
store: plan
````

| Field    | Type     | Required | Description                          |
| :------- | :------- | :------: | :----------------------------------- |
| `call`   | `string` |   Yes    | Relative path to worker              |
| `weight` | `number` |   Yes    | Progress weight (SDK 4.2+)           |
| `input`  | `object` |   Yes    | Input mapping with `${}` expressions |
| `store`  | `string` |   Yes    | Artifact key to store output         |

### parallel

Runs multiple workers concurrently.

```yaml
parallel:
  weight: 25
  steps:
    - call: workers/analyzer
      input:
        data: ${input.data}
      store: analysis

    - call: workers/validator
      input:
        rules: ${input.rules}
      store: validation
```

| Field      | Type         | Required | Description                   |
| :--------- | :----------- | :------: | :---------------------------- |
| `parallel` | -            |   Yes    | Marker for parallel execution |
| `weight`   | `number`     |   Yes    | Combined progress weight      |
| `steps`    | `CallStep[]` |   Yes    | Array of call steps           |

### loop

Iterates over an array, executing workers for each item.

```yaml
loop:
  weight: 40
  over: ${artifacts.days}
  itemVar: day
  mode: parallel
  outputKey: generatedDays
  steps:
    - call: workers/day-generator
      input:
        day: ${artifacts.day}
        template: ${artifacts.template}
      store: dayResult
```

| Field       | Type                         | Required | Description                          |
| :---------- | :--------------------------- | :------: | :----------------------------------- |
| `loop`      | -                            |   Yes    | Marker for loop execution            |
| `weight`    | `number`                     |   Yes    | Progress weight                      |
| `over`      | `string`                     |   Yes    | Expression resolving to array        |
| `itemVar`   | `string`                     |   Yes    | Variable name for current item       |
| `mode`      | `"parallel" \| "sequential"` |    No    | Execution mode (default: sequential) |
| `maxItems`  | `number \| string`           |    No    | Limit iterations                     |
| `outputKey` | `string`                     |    No    | Collect outputs into array           |
| `steps`     | `Step[]`                     |   Yes    | Steps to execute per iteration       |

### conditional

Executes steps based on a condition.

```yaml
conditional:
  weight: 15
  condition: ${artifacts.needsValidation}
  then:
    - call: workers/validator
      input:
        data: ${artifacts.data}
      store: validated
  else:
    - transform: passthrough
      input:
        data: ${artifacts.data}
      store: validated
```

| Field         | Type     | Required | Description                     |
| :------------ | :------- | :------: | :------------------------------ |
| `conditional` | -        |   Yes    | Marker for conditional          |
| `weight`      | `number` |   Yes    | Progress weight                 |
| `condition`   | `string` |   Yes    | Expression resolving to boolean |
| `then`        | `Step[]` |   Yes    | Steps if condition is true      |
| `else`        | `Step[]` |    No    | Steps if condition is false     |

### transform

Executes a pure synchronous function.

```yaml
transform: calculateMacros
weight: 5
input:
  profile: ${input.userProfile}
  goals: ${input.goals}
store: macros
```

| Field       | Type     | Required | Description                    |
| :---------- | :------- | :------: | :----------------------------- |
| `transform` | `string` |   Yes    | Function name from transforms/ |
| `weight`    | `number` |   Yes    | Progress weight                |
| `input`     | `object` |   Yes    | Input mapping                  |
| `store`     | `string` |   Yes    | Artifact key to store result   |

**Transform functions** must be defined in `transforms/index.ts`:

```typescript
// transforms/index.ts
export function calculateMacros(input: { profile: UserProfile; goals: Goals }) {
  const { profile, goals } = input;
  return {
    protein: calculateProtein(profile, goals),
    carbs: calculateCarbs(profile, goals),
    fats: calculateFats(profile, goals),
  };
}
```

---

## Expression Syntax

Expressions use `${}` syntax to reference:

| Expression                | Description               |
| :------------------------ | :------------------------ |
| `${input.fieldName}`      | Original workflow input   |
| `${artifacts.stepResult}` | Output from previous step |
| `${artifacts.loopVar}`    | Current loop item         |

### Nested Access

```yaml
input:
  name: ${input.user.profile.name}
  macros: ${artifacts.nutritionPlan.dailyMacros}
```

### Array Access

```yaml
input:
  firstItem: ${artifacts.items[0]}
  count: ${artifacts.items.length}
```

---

## Weight System (SDK 4.2+)

Every step **must** have a `weight` field. Weights determine progress distribution.

### Rules

1. Weights should sum to **100** across all top-level steps
2. Weights are relative (10 = twice as much as 5)
3. Nested step weights are relative to parent

### Example

```yaml
# Step 1 - 10% of progress
transform: initialize
weight: 10
...
# Step 2 - 30% of progress
call: workers/planner
weight: 30
...
# Step 3 - 45% of progress (parallel takes combined weight)
parallel:
  weight: 45
  steps:
    - call: workers/generator-1
    - call: workers/generator-2
    - call: workers/generator-3

# Step 4 - 15% of progress
call: workers/validator
weight: 15
...
```

### Progress Mapping

The SDK maps step weights to progress percentages:

```
Step 1 (weight: 10): 10% - 20%
Step 2 (weight: 30): 20% - 50%
Step 3 (weight: 45): 50% - 85%
Step 4 (weight: 15): 85% - 100%
```

---

## Complete Example

````markdown
# Workout Generation Workflow

## 1. Initial Analysis

```yaml
parallel:
  weight: 20
  steps:
    - call: workers/exercise-selector
      input:
        catalog: ${input.exerciseCatalog}
        goals: ${input.goals}
        restrictions: ${input.restrictions}
      store: selectedExercises

    - call: workers/workout-planner
      input:
        goals: ${input.goals}
        experience: ${input.userProfile.experience}
      store: workoutStructure
```
````

## 2. Calculate Progression

```yaml
call: workers/progression-calculator
weight: 15
input:
  exercises: ${artifacts.selectedExercises}
  structure: ${artifacts.workoutStructure}
  userProfile: ${input.userProfile}
store: progressionMatrix
```

## 3. Generate Days

```yaml
call: workers/day-generator
weight: 25
input:
  structure: ${artifacts.workoutStructure}
  exercises: ${artifacts.selectedExercises}
  progression: ${artifacts.progressionMatrix}
store: week1Template
```

## 4. Merge and Validate

```yaml
transform: mergeExercises
weight: 5
input:
  template: ${artifacts.week1Template}
  exercises: ${artifacts.selectedExercises}
store: mergedTemplate
```

## 5. Post-Processing

```yaml
parallel:
  weight: 25
  steps:
    - call: workers/progression-diff-generator
      input:
        week1: ${artifacts.mergedTemplate}
        progression: ${artifacts.progressionMatrix}
        weekCount: ${input.goals.weekCount}
      store: weeklyDiffs

    - call: workers/validator
      input:
        program: ${artifacts.mergedTemplate}
        goals: ${input.goals}
      store: validationResult
```

## 6. Assemble Final Program

```yaml
transform: assembleWeeksFromDiffs
weight: 10
input:
  week1: ${artifacts.mergedTemplate}
  diffs: ${artifacts.weeklyDiffs}
  userProfile: ${input.userProfile}
  goals: ${input.goals}
store: finalProgram
```

````

---

## Best Practices

### 1. Use Meaningful Step Names

```markdown
## 3. Generate Weekly Workout Schedule  ✓
## 3. Step 3                            ✗
````

### 2. Store Intermediate Results

```yaml
# Good - each step stores its output
call: workers/planner
store: plan

call: workers/generator
input:
  plan: ${artifacts.plan}
store: generated
```

### 3. Use Parallel for Independent Work

```yaml
# These workers don't depend on each other
parallel:
  weight: 30
  steps:
    - call: workers/analyzer
    - call: workers/validator
    - call: workers/formatter
```

### 4. Use Transforms for Pure Computation

```yaml
# Transforms are synchronous and fast
transform: calculateTotals
weight: 5
input:
  items: ${artifacts.items}
store: totals
```

### 5. Balance Weights Appropriately

```yaml
# Heavy computation gets more weight
call: workers/ai-generator
weight: 60

# Light validation gets less weight
call: workers/validator
weight: 10
```
