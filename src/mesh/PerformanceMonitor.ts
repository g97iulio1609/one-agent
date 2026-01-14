/**
 * Performance Monitor
 *
 * Tracks execution times, throughput, and performance metrics for agent orchestration.
 * Provides insights for optimization and bottleneck identification.
 */

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface PerformanceStats {
  operation: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
}

/**
 * Performance Monitor for tracking agent execution metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number;

  constructor(maxMetrics: number = 1000) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Track an operation's performance
   */
  track(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.track(operation, duration, { ...metadata, success: true });
      return result;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      this.track(operation, duration, { ...metadata, success: false, error: String(error) });
      throw error;
    }
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(operation: string): PerformanceStats | null {
    const operationMetrics = this.metrics.filter((m: any) => m.operation === operation);

    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map((m: any) => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum: any, d: any) => sum + d, 0);

    // Safety check - should never happen due to check above, but TypeScript needs it
    if (durations.length === 0) {
      return null;
    }

    return {
      operation,
      count: durations.length,
      totalDuration,
      avgDuration: totalDuration / durations.length,
      minDuration: durations[0]!,
      maxDuration: durations[durations.length - 1]!,
      p50Duration: this.percentile(durations, 0.5),
      p95Duration: this.percentile(durations, 0.95),
      p99Duration: this.percentile(durations, 0.99),
    };
  }

  /**
   * Get all statistics grouped by operation
   */
  getAllStats(): PerformanceStats[] {
    const operations = [...new Set(this.metrics.map((m: PerformanceMetric) => m.operation))];
    return operations.map((op: string) => this.getStats(op)!).filter(Boolean);
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 10): PerformanceMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }
    const index = Math.ceil(sortedValues.length * p) - 1;
    const result = sortedValues[Math.max(0, index)];
    return result ?? 0;
  }

  /**
   * Print performance report
   */
  printReport(): void {
    const stats = this.getAllStats();

    console.warn('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.warn('║              PERFORMANCE MONITORING REPORT                        ║');
    console.warn('╚═══════════════════════════════════════════════════════════════════╝\n');

    stats.forEach((stat: PerformanceStats) => {
      console.warn(`Operation: ${stat.operation}`);
      console.warn(`  Count:       ${stat.count}`);
      console.warn(`  Avg:         ${stat.avgDuration.toFixed(2)}ms`);
      console.warn(`  Min/Max:     ${stat.minDuration}ms / ${stat.maxDuration}ms`);
      console.warn(
        `  P50/P95/P99: ${stat.p50Duration}ms / ${stat.p95Duration}ms / ${stat.p99Duration}ms`
      );
      console.warn('');
    });
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify(
      {
        timestamp: new Date(),
        stats: this.getAllStats(),
        recentMetrics: this.getRecentMetrics(20),
      },
      null,
      2
    );
  }
}

/**
 * Global performance monitor instance
 */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get global performance monitor
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(2000); // Keep last 2000 metrics
  }
  return globalMonitor;
}

/**
 * Reset global performance monitor
 */
export function resetPerformanceMonitor(): void {
  globalMonitor = new PerformanceMonitor(2000);
}
