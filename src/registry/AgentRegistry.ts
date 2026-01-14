/**
 * Agent Registry
 *
 * Unified registry for all OneAgent SDK 2.5 agents with native capability discovery.
 * Eliminates adapter layers and provides direct access to mesh-native agents.
 *
 * Principles: KISS, SOLID, DRY
 * - Single source of truth for agent capabilities
 * - Type-safe agent registration and discovery
 * - No adapter layers or wrapper classes
 */

// MeshAgent and MeshCoordinator are imported for type purposes but not directly used
// They are used via BaseMeshAgentOrCoordinator type
import { AgentRole } from '../mesh/types';
import type { BaseMeshAgentOrCoordinator } from '../core/type-helpers';

/**
 * Agent capability definition
 */
export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  domains: string[];
}

/**
 * Registered agent metadata
 */
export interface RegisteredAgent {
  id: string;
  name: string;
  role: AgentRole | string; // Support custom roles
  instance: BaseMeshAgentOrCoordinator;
  capabilities: AgentCapability[];
  priority: number;
  status: 'active' | 'inactive' | 'error';
  metadata: {
    version: string;
    createdAt: Date;
    lastUsed?: Date;
    totalExecutions: number;
    successRate: number;
  };
}

/**
 * Agent discovery query
 */
export interface AgentQuery {
  capabilities?: string[];
  domains?: string[];
  keywords?: string[];
  role?: AgentRole | string;
  minPriority?: number;
}

/**
 * Agent Registry
 *
 * Central registry for all agents in the mesh
 */
export class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();
  private capabilities: Map<string, AgentCapability> = new Map();

  /**
   * Register an agent
   */
  register(agent: RegisteredAgent): void {
    this.agents.set(agent.id, agent);

    // Index capabilities
    agent.capabilities.forEach((cap: AgentCapability) => {
      this.capabilities.set(cap.id, cap);
    });
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      // Remove capability indexes
      agent.capabilities.forEach((cap: AgentCapability) => {
        this.capabilities.delete(cap.id);
      });
      this.agents.delete(agentId);
    }
  }

  /**
   * Get agent by ID
   */
  get(agentId: string): RegisteredAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Discover agents by query
   */
  discover(query: AgentQuery): RegisteredAgent[] {
    let results = Array.from(this.agents.values());

    // Filter by status (only active)
    results = results.filter((agent: RegisteredAgent) => agent.status === 'active');

    // Filter by role
    if (query.role) {
      results = results.filter((agent: RegisteredAgent) => agent.role === query.role);
    }

    // Filter by capabilities
    if (query.capabilities && query.capabilities.length > 0) {
      results = results.filter((agent: RegisteredAgent) =>
        query.capabilities!.some((reqCap) =>
          agent.capabilities.some((cap) => cap.id === reqCap || cap.name === reqCap)
        )
      );
    }

    // Filter by domains
    if (query.domains && query.domains.length > 0) {
      results = results.filter((agent: RegisteredAgent) =>
        query.domains!.some((reqDomain) =>
          agent.capabilities.some((cap) => cap.domains.includes(reqDomain))
        )
      );
    }

    // Filter by keywords
    if (query.keywords && query.keywords.length > 0) {
      results = results.filter((agent: RegisteredAgent) =>
        query.keywords!.some((keyword) =>
          agent.capabilities.some((cap) =>
            cap.keywords.some((kw) => kw.toLowerCase().includes(keyword.toLowerCase()))
          )
        )
      );
    }

    // Filter by minimum priority
    if (query.minPriority !== undefined) {
      results = results.filter((agent: RegisteredAgent) => agent.priority >= query.minPriority!);
    }

    // Sort by priority (descending) and success rate
    results.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.metadata.successRate - a.metadata.successRate;
    });

    return results;
  }

  /**
   * Get all registered agents
   */
  getAll(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all capabilities
   */
  getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Find capability by ID or name
   */
  findCapability(idOrName: string): AgentCapability | undefined {
    return (
      this.capabilities.get(idOrName) ||
      Array.from(this.capabilities.values()).find((cap: AgentCapability) => cap.name === idOrName)
    );
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: string, status: RegisteredAgent['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
    }
  }

  /**
   * Record agent execution
   */
  recordExecution(agentId: string, success: boolean): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.metadata.lastUsed = new Date();
      agent.metadata.totalExecutions += 1;

      // Update success rate with exponential moving average
      const alpha = 0.1; // Weight for new observation
      const currentRate = agent.metadata.successRate;
      agent.metadata.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * currentRate;
    }
  }

  /**
   * Get agent statistics
   */
  getStats(): {
    totalAgents: number;
    activeAgents: number;
    totalCapabilities: number;
    agentsByRole: Record<string, number>;
  } {
    const agents = Array.from(this.agents.values());

    const agentsByRole = agents.reduce(
      (acc: Record<string, number>, agent: RegisteredAgent) => {
        const role = String(agent.role);
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter((a: RegisteredAgent) => a.status === 'active').length,
      totalCapabilities: this.capabilities.size,
      agentsByRole,
    };
  }

  /**
   * Clear all agents (for testing)
   */
  clear(): void {
    this.agents.clear();
    this.capabilities.clear();
  }
}

/**
 * Singleton instance
 */
let globalRegistry: AgentRegistry | null = null;

/**
 * Get global agent registry
 */
export function getAgentRegistry(): AgentRegistry {
  if (!globalRegistry) {
    globalRegistry = new AgentRegistry();
  }
  return globalRegistry;
}

/**
 * Reset global registry (for testing)
 */
export function resetAgentRegistry(): void {
  globalRegistry = null;
}
