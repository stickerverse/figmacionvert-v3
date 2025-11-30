/**
 * Circuit Breaker - Guardrail for preventing infinite loops and long-running operations
 */

export interface CircuitBreakerConfig {
  maxOperations: number;
  maxDurationMs: number;
  checkInterval?: number;
  name?: string;
}

export class CircuitBreaker {
  private operationCount = 0;
  private startTime = 0;
  private lastCheckTime = 0;
  private readonly config: CircuitBreakerConfig;
  private _isBroken = false;
  private breakReason: string | null = null;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      checkInterval: 100, // Check time every 100 ops
      name: "CircuitBreaker",
      ...config,
    };
    this.reset();
  }

  /**
   * Reset the circuit breaker state
   */
  reset(): void {
    this.operationCount = 0;
    this.startTime = Date.now();
    this.lastCheckTime = this.startTime;
    this._isBroken = false;
    this.breakReason = null;
  }

  /**
   * Increment operation count and check limits
   * Throws Error if circuit is broken
   */
  tick(): void {
    if (this._isBroken) {
      throw new Error(`Circuit broken: ${this.breakReason}`);
    }

    this.operationCount++;

    // Only check time occasionally to reduce overhead
    if (this.operationCount % (this.config.checkInterval || 100) === 0) {
      this.checkLimits();
    }
  }

  /**
   * Explicitly check limits without incrementing
   */
  check(): void {
    if (this._isBroken) {
      throw new Error(`Circuit broken: ${this.breakReason}`);
    }
    this.checkLimits();
  }

  private checkLimits(): void {
    // Check operation count
    if (this.operationCount > this.config.maxOperations) {
      this.trip(`Exceeded maximum operations (${this.config.maxOperations})`);
      return;
    }

    // Check duration
    const now = Date.now();
    const duration = now - this.startTime;
    if (duration > this.config.maxDurationMs) {
      this.trip(`Exceeded maximum duration (${this.config.maxDurationMs}ms)`);
      return;
    }
  }

  private trip(reason: string): void {
    this._isBroken = true;
    this.breakReason = reason;
    console.warn(`🔥 [${this.config.name}] Circuit tripped: ${reason}`);
    throw new Error(`[${this.config.name}] ${reason}`);
  }

  get isBroken(): boolean {
    return this._isBroken;
  }

  get stats() {
    return {
      operations: this.operationCount,
      duration: Date.now() - this.startTime,
      isBroken: this._isBroken,
      reason: this.breakReason,
    };
  }
}
