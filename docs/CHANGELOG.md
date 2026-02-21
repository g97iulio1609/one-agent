# Changelog

All notable changes to the OneAgent SDK.

## [4.2.0-alpha.0] - 2025-01-15

### Added

- **Weighted Progress Distribution** - All workflow steps now require a `weight` field for accurate progress tracking
- **Skills Configuration** - New `skills` field in agent.json for explicit skill management
  - `skills.path` - Directory containing skill files (default: "skills")
  - `skills.expose` - Array of skill names visible to parent agents (default: [])
- **Tools Configuration** - New `tools` field for explicit tool management
  - `tools.source` - Tool source: "registry" or "mcp" (default: "registry")
  - `tools.allowlist` - Allowed tool names (default: [] = all)
- **Progress Configuration** - New `progress` field for progress tracking control
  - `progress.aiDriven` - Expect AI to report `_progress` (default: true)
  - `progress.fallbackSteps` - Fallback steps with names and weights
- **OAUTH_PROVIDERS** - Centralized OAuth provider constant
- **loadAgentSkills()** - Function to load agent skills with visibility handling

### Changed

- **Skill Visibility** - Skills are now private by default (secure-by-default)
- **Progress Mapping** - Worker progress now maps to manager's step range
- **Workflow Steps** - All step types (call, parallel, loop, conditional, transform) now support optional `weight` field

### Fixed

- Removed duplicate `DEFAULT_CONFIG` in loader.ts
- Removed duplicate `estimateTokens` in worker.ts
- Removed duplicate `getNestedValue` in worker.ts
- Fixed TypeScript error with undefined step in workflow iteration

### Breaking Changes

- `weight` is now required on all WORKFLOW.md steps
- Skills no longer exposed by default (must use `skills.expose`)
- Agent version should be updated to 2.1.0 for SDK 4.2 compliance

---

## [4.1.0] - 2024-12-XX

### Added

- Durable execution mode with checkpointing
- Retry configuration with exponential backoff
- Transform steps for synchronous data processing

### Changed

- Improved error handling in workflow execution
- Better progress streaming

---

## [4.0.0] - 2024-11-XX

### Added

- Initial multi-agent workflow support
- WORKFLOW.md DSL with call, parallel, loop, conditional steps
- Artifact passing between steps
- Worker pattern for single-agent execution

### Changed

- Complete rewrite of agent execution model
- New agent.json schema

---

## Migration Guides

- [4.0/4.1 → 4.2](./migration-guide.md)
