/**
 * OneAgent SDK 2.5 - Cost Calculator
 *
 * Calculates AI model costs based on token usage
 * Following Single Responsibility Principle
 */

import type { ICostCalculator } from './types';

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

/**
 * Cost calculator implementation
 * Prices are configurable, not hardcoded
 */
export class CostCalculator implements ICostCalculator {
  private readonly pricing: Map<string, ModelPricing>;

  constructor(pricing: Record<string, ModelPricing>) {
    this.pricing = new Map(Object.entries(pricing));
  }

  /**
   * Calculate cost for a given model and token usage
   */
  calculateCost(model: string, tokensUsed: number): number {
    const modelPricing = this.pricing.get(model);

    if (!modelPricing) {
      console.warn(`No pricing found for model: ${model}, using default`);
      return (tokensUsed / 1_000_000) * 0.01; // Default fallback
    }

    // Assume 50/50 split between input and output tokens (approximation)
    const inputTokens = Math.floor(tokensUsed * 0.5);
    const outputTokens = tokensUsed - inputTokens;

    const inputCost = (inputTokens / 1_000_000) * modelPricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.outputPer1M;

    return inputCost + outputCost;
  }

  /**
   * Add or update pricing for a model
   */
  setPricing(model: string, pricing: ModelPricing): void {
    this.pricing.set(model, pricing);
  }

  /**
   * Get pricing for a model
   */
  getPricing(model: string): ModelPricing | undefined {
    return this.pricing.get(model);
  }
}

/**
 * Default pricing configuration (can be overridden)
 */
export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': {
    inputPer1M: 2.5,
    outputPer1M: 10.0,
  },
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.6,
  },
  'gpt-4-turbo': {
    inputPer1M: 10.0,
    outputPer1M: 30.0,
  },
  'claude-3-5-sonnet-20241022': {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
  },
  'claude-3-5-haiku-20241022': {
    inputPer1M: 0.8,
    outputPer1M: 4.0,
  },
  'claude-3-opus-20240229': {
    inputPer1M: 15.0,
    outputPer1M: 75.0,
  },
};

/**
 * Create a cost calculator with default pricing
 */
export function createCostCalculator(customPricing?: Record<string, ModelPricing>): CostCalculator {
  return new CostCalculator({ ...DEFAULT_MODEL_PRICING, ...customPricing });
}
