/**
 * Regression test: Ensure the main barrel export (index.ts) does NOT
 * re-export server-only modules that would crash the client bundle.
 *
 * Background: The barrel previously exported VercelAIProvider, agents,
 * and ai-agent-setup, which pulled @ai-sdk/openai and @ai-sdk/anthropic
 * into the client bundle, causing "Module factory not available" errors.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const indexPath = join(__dirname, '..', 'index.ts');
const copilotIndexPath = join(__dirname, '..', 'copilot', 'index.ts');

describe('barrel exports (index.ts)', () => {
  let indexContent: string;

  beforeAll(() => {
    indexContent = readFileSync(indexPath, 'utf-8');
  });

  it('should NOT export VercelAIProvider (server-only)', () => {
    // VercelAIProvider imports @ai-sdk/openai and @ai-sdk/anthropic
    expect(indexContent).not.toMatch(/export\s+\*\s+from\s+['"]\.\/adapters\/VercelAIProvider['"]/);
  });

  it('should NOT export agents/copilot (server-only)', () => {
    expect(indexContent).not.toMatch(/export\s+\*\s+from\s+['"]\.\/agents\/copilot['"]/);
  });

  it('should NOT export agents/chat (server-only)', () => {
    expect(indexContent).not.toMatch(/export\s+\*\s+from\s+['"]\.\/agents\/chat['"]/);
  });

  it('should NOT export utils/ai-agent-setup (server-only)', () => {
    expect(indexContent).not.toMatch(/export\s+\*\s+from\s+['"]\.\/utils\/ai-agent-setup['"]/);
  });

  it('should export client-safe copilot module', () => {
    expect(indexContent).toMatch(/export\s+\*\s+from\s+['"]\.\/copilot['"]/);
  });
});

describe('copilot/index.ts', () => {
  let copilotContent: string;

  beforeAll(() => {
    copilotContent = readFileSync(copilotIndexPath, 'utf-8');
  });

  it('should NOT re-export framework (pulls in ai SDK runtime)', () => {
    // The framework module imports streamText from 'ai' via macro-recalculator
    expect(copilotContent).not.toMatch(/^export\s+\*\s+from\s+['"]\.\/framework['"]/m);
  });

  it('should export client-safe modules (components, hooks, providers)', () => {
    expect(copilotContent).toMatch(/export\s+\*\s+from\s+['"]\.\/components['"]/);
    expect(copilotContent).toMatch(/export\s+\*\s+from\s+['"]\.\/hooks['"]/);
    expect(copilotContent).toMatch(/export\s+\*\s+from\s+['"]\.\/providers['"]/);
  });
});

describe('server.ts entry point', () => {
  let serverContent: string;

  beforeAll(() => {
    serverContent = readFileSync(join(__dirname, '..', 'server.ts'), 'utf-8');
  });

  it('should export VercelAIProvider', () => {
    expect(serverContent).toMatch(/export\s+\*\s+from\s+['"]\.\/adapters\/VercelAIProvider['"]/);
  });

  it('should export server agents', () => {
    expect(serverContent).toMatch(/export\s+\*\s+from\s+['"]\.\/agents\/copilot['"]/);
    expect(serverContent).toMatch(/export\s+\*\s+from\s+['"]\.\/agents\/chat['"]/);
  });

  it('should export ai-agent-setup', () => {
    expect(serverContent).toMatch(/export\s+\*\s+from\s+['"]\.\/utils\/ai-agent-setup['"]/);
  });
});
