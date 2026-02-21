# Migration Guide: SDK 4.0/4.1 to 4.2

This guide covers upgrading your agents from SDK 4.0 or 4.1 to SDK 4.2.

## Summary of Changes

| Feature          | SDK 4.0/4.1 | SDK 4.2                 |
| :--------------- | :---------- | :---------------------- |
| Skills config    | Implicit    | Explicit `skills` field |
| Tools config     | Implicit    | Explicit `tools` field  |
| Progress         | Basic       | Weighted + AI-driven    |
| Workflow weights | Optional    | Required                |
| Skill visibility | All exposed | Secure-by-default       |

---

## Breaking Changes

### 1. Required `weight` on Workflow Steps

**Before (4.0/4.1):**

```yaml
call: workers/planner
input:
  goals: ${input.goals}
store: plan
```

**After (4.2):**

```yaml
call: workers/planner
weight: 30
input:
  goals: ${input.goals}
store: plan
```

**Action:** Add `weight` to every step in WORKFLOW.md. Weights should sum to 100.

---

### 2. Explicit Skills Configuration

**Before (4.0/4.1):**

```json
{
  "id": "my-agent",
  "version": "2.0.0"
  // skills auto-loaded from skills/
}
```

**After (4.2):**

```json
{
  "id": "my-agent",
  "version": "2.1.0",
  "skills": {
    "path": "skills",
    "expose": []
  }
}
```

**Action:** Add `skills` configuration to all agent.json files.

---

### 3. Explicit Tools Configuration

**Before (4.0/4.1):**

```json
{
  "id": "my-agent",
  "mcpServers": { ... }
  // all tools available
}
```

**After (4.2):**

```json
{
  "id": "my-agent",
  "mcpServers": { ... },
  "tools": {
    "source": "mcp",
    "allowlist": ["tool1", "tool2"]
  }
}
```

**Action:** Add `tools` configuration. Use `allowlist: []` to allow all tools.

---

### 4. Progress Configuration

**Before (4.0/4.1):**

```json
{
  "id": "my-agent"
  // no progress config
}
```

**After (4.2):**

```json
{
  "id": "my-agent",
  "progress": {
    "aiDriven": true,
    "fallbackSteps": [
      { "name": "Step 1", "weight": 50 },
      { "name": "Step 2", "weight": 50 }
    ]
  }
}
```

**Action:** Add `progress` configuration to all agent.json files.

---

### 5. Skill Visibility Default

**Before (4.0/4.1):** All skills visible to parent agents by default.

**After (4.2):** Skills are private by default. Explicitly expose with `expose` array.

**Action:** If parent agents need child skills, add them to `expose`:

```json
{
  "skills": {
    "path": "skills",
    "expose": ["skill-name-1", "skill-name-2"]
  }
}
```

---

## Step-by-Step Migration

### Step 1: Update Version

Change version in all agent.json files:

```diff
- "version": "2.0.0"
+ "version": "2.1.0"
```

### Step 2: Add Skills Config

Add to all agent.json:

```json
"skills": {
  "path": "skills",
  "expose": []
}
```

### Step 3: Add Tools Config

Add to all agent.json:

```json
"tools": {
  "source": "registry",
  "allowlist": []
}
```

Or for MCP tools:

```json
"tools": {
  "source": "mcp",
  "allowlist": []
}
```

### Step 4: Add Progress Config

**For Workers:**

```json
"progress": {
  "aiDriven": true,
  "fallbackSteps": [
    { "name": "Processing", "weight": 100 }
  ]
}
```

**For Managers:**

```json
"progress": {
  "aiDriven": false,
  "fallbackSteps": [
    { "name": "Step 1", "weight": 30 },
    { "name": "Step 2", "weight": 40 },
    { "name": "Step 3", "weight": 30 }
  ]
}
```

### Step 5: Add Weights to WORKFLOW.md

For manager agents, add `weight` to every step:

````diff
  ## 1. Plan Workout

  ```yaml
  call: workers/planner
+ weight: 30
  input:
    goals: ${input.goals}
  store: plan
````

````

### Step 6: Verify Weights Sum to 100

Check your WORKFLOW.md:

```yaml
# All steps should sum to 100
Step 1: weight: 20
Step 2: weight: 30
Step 3: weight: 35
Step 4: weight: 15
# Total: 20 + 30 + 35 + 15 = 100 ✓
````

### Step 7: Update Skill Visibility

If parent agents need access to child skills:

```json
{
  "skills": {
    "path": "skills",
    "expose": ["analysis", "recommendation"]
  }
}
```

### Step 8: Run Type Check

```bash
pnpm type-check
```

Fix any TypeScript errors.

---

## Complete Before/After Example

### Before (SDK 4.0)

**agent.json:**

```json
{
  "id": "nutrition-planner",
  "version": "2.0.0",
  "type": "agent",
  "description": "Plans nutrition for users",
  "interface": {
    "input": { "$ref": "./schema.ts#Input" },
    "output": { "$ref": "./schema.ts#Output" }
  },
  "mcpServers": {},
  "config": {
    "tier": "balanced",
    "temperature": 1,
    "maxSteps": 15,
    "timeout": 120000,
    "executionMode": "durable"
  }
}
```

**WORKFLOW.md:**

````yaml
## 1. Calculate Macros
```yaml
transform: calculateMacros
input:
  profile: ${input.profile}
store: macros
````

## 2. Plan Meals

```yaml
call: workers/meal-planner
input:
  macros: ${artifacts.macros}
store: meals
```

````

### After (SDK 4.2)

**agent.json:**
```json
{
  "id": "nutrition-planner",
  "version": "2.1.0",
  "type": "agent",
  "description": "Plans nutrition for users",
  "interface": {
    "input": { "$ref": "./schema.ts#Input" },
    "output": { "$ref": "./schema.ts#Output" }
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
    "aiDriven": false,
    "fallbackSteps": [
      { "name": "Calculate macros", "weight": 20 },
      { "name": "Plan meals", "weight": 80 }
    ]
  },
  "config": {
    "tier": "balanced",
    "temperature": 1,
    "maxSteps": 15,
    "timeout": 120000,
    "executionMode": "durable"
  }
}
````

**WORKFLOW.md:**

````yaml
## 1. Calculate Macros
```yaml
transform: calculateMacros
weight: 20
input:
  profile: ${input.profile}
store: macros
````

## 2. Plan Meals

```yaml
call: workers/meal-planner
weight: 80
input:
  macros: ${artifacts.macros}
store: meals
```

````

---

## Checklist

Use this checklist for each agent:

- [ ] Updated version to 2.1.0
- [ ] Added `skills` configuration
- [ ] Added `tools` configuration
- [ ] Added `progress` configuration
- [ ] Added `weight` to all WORKFLOW.md steps (managers only)
- [ ] Verified weights sum to 100
- [ ] Verified fallbackSteps weights sum to 100
- [ ] Updated skill exposure if needed
- [ ] Ran type-check successfully

---

## Troubleshooting

### Error: "weight is required on workflow steps"

Add `weight` to the step in WORKFLOW.md.

### Error: "skills.path not found"

Ensure the `skills` directory exists, or update the path:

```json
"skills": {
  "path": "my-skills-folder",
  "expose": []
}
````

### Error: "progress.fallbackSteps weights don't sum to 100"

This is a warning, not an error. Adjust weights to sum to 100 for accurate progress.

### Workers not receiving parent skills

Check the child agent exposes the skill:

```json
// Child agent.json
"skills": {
  "expose": ["needed-skill"]
}
```

---

## Need Help?

- Check the [Agent Configuration](./agent-configuration.md) reference
- Review the [Progress System](./progress-system.md) documentation
- See [Workflow DSL](./workflow-dsl.md) for step syntax
