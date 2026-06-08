import { redis } from '@/lib/redis-session';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Variable System for Flow Builder
 * Manages user context variables saved in Redis for fast access
 * and Prisma for persistent storage
 */

export interface VariableStore {
  sessionId: string;
  tenantId: string;
  variables: Record<string, any>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
  };
}

export class VariableManager {
  private readonly REDIS_PREFIX = 'flow:vars:';
  private readonly REDIS_TTL = 86400; // 24 hours

  /**
   * Initialize variable store for a session
   */
  async initializeSession(sessionId: string, tenantId: string, initialVars?: Record<string, any>) {
    const store: VariableStore = {
      sessionId,
      tenantId,
      variables: initialVars || {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}`;
    
    // Save to Redis with TTL
    await redis.setex(key, this.REDIS_TTL, JSON.stringify(store));
    
    // Save to database for persistence
    await prisma.sessionContext.upsert({
      where: { sessionId },
      create: {
        sessionId,
        tenantId,
        variables: store.variables,
        metadata: store.metadata,
      },
      update: {
        variables: store.variables,
        metadata: store.metadata,
      },
    });

    return store;
  }

  /**
   * Get all variables for a session
   */
  async getVariables(sessionId: string, tenantId: string): Promise<Record<string, any>> {
    const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}`;
    
    // Try Redis first (fast path)
    const cached = await redis.get(key);
    if (cached) {
      const store: VariableStore = JSON.parse(cached);
      return store.variables;
    }

    // Fall back to database
    const context = await prisma.sessionContext.findUnique({
      where: { sessionId },
    });

    if (context) {
      // Restore to Redis
      await redis.setex(key, this.REDIS_TTL, JSON.stringify({
        sessionId,
        tenantId,
        variables: context.variables,
        metadata: context.metadata,
      }));
      return context.variables;
    }

    return {};
  }

  /**
   * Set a single variable
   */
  async setVariable(
    sessionId: string,
    tenantId: string,
    variableName: string,
    value: any
  ) {
    const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}`;
    
    // Get current store
    let store = await this._getStore(sessionId, tenantId);
    if (!store) {
      store = await this.initializeSession(sessionId, tenantId);
    }

    // Update variable
    store.variables[variableName] = value;
    store.metadata.updatedAt = new Date().toISOString();

    // Save to Redis
    await redis.setex(key, this.REDIS_TTL, JSON.stringify(store));

    // Persist to database
    await prisma.sessionContext.update({
      where: { sessionId },
      data: {
        variables: store.variables,
        metadata: store.metadata,
      },
    });

    return value;
  }

  /**
   * Get a single variable
   */
  async getVariable(sessionId: string, tenantId: string, variableName: string) {
    const variables = await this.getVariables(sessionId, tenantId);
    return variables[variableName];
  }

  /**
   * Update multiple variables
   */
  async updateVariables(
    sessionId: string,
    tenantId: string,
    updates: Record<string, any>
  ) {
    const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}`;
    
    // Get current store
    let store = await this._getStore(sessionId, tenantId);
    if (!store) {
      store = await this.initializeSession(sessionId, tenantId);
    }

    // Merge updates
    store.variables = {
      ...store.variables,
      ...updates,
    };
    store.metadata.updatedAt = new Date().toISOString();

    // Save to Redis
    await redis.setex(key, this.REDIS_TTL, JSON.stringify(store));

    // Persist to database
    await prisma.sessionContext.update({
      where: { sessionId },
      data: {
        variables: store.variables,
        metadata: store.metadata,
      },
    });

    return store.variables;
  }

  /**
   * Delete a variable
   */
  async deleteVariable(sessionId: string, tenantId: string, variableName: string) {
    const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}`;
    
    let store = await this._getStore(sessionId, tenantId);
    if (!store) return;

    delete store.variables[variableName];
    store.metadata.updatedAt = new Date().toISOString();

    // Update Redis
    await redis.setex(key, this.REDIS_TTL, JSON.stringify(store));

    // Update database
    await prisma.sessionContext.update({
      where: { sessionId },
      data: {
        variables: store.variables,
        metadata: store.metadata,
      },
    });
  }

  /**
   * Clear all variables for a session
   */
  async clearSession(sessionId: string, tenantId: string) {
    const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}`;
    
    // Remove from Redis
    await redis.del(key);

    // Remove from database
    await prisma.sessionContext.delete({
      where: { sessionId },
    }).catch(() => {
      // Session might not exist in DB, that's ok
    });
  }

  /**
   * Set variable expiration (for temporary variables)
   */
  async setVariableExpiration(
    sessionId: string,
    tenantId: string,
    variableName: string,
    expiresInSeconds: number
  ) {
    const value = await this.getVariable(sessionId, tenantId, variableName);
    if (value === undefined) return;

    // Store expiration info in a separate Redis key
    const expiryKey = `${this.REDIS_PREFIX}${tenantId}:${sessionId}:expiry:${variableName}`;
    await redis.setex(expiryKey, expiresInSeconds, '1');

    // Check and cleanup expired variables periodically
    this._scheduleExpiredVariableCleanup(sessionId, tenantId);
  }

  /**
   * Increment a numeric variable
   */
  async incrementVariable(
    sessionId: string,
    tenantId: string,
    variableName: string,
    amount: number = 1
  ) {
    const current = await this.getVariable(sessionId, tenantId, variableName) || 0;
    const newValue = Number(current) + amount;
    return this.setVariable(sessionId, tenantId, variableName, newValue);
  }

  /**
   * Decrement a numeric variable
   */
  async decrementVariable(
    sessionId: string,
    tenantId: string,
    variableName: string,
    amount: number = 1
  ) {
    return this.incrementVariable(sessionId, tenantId, variableName, -amount);
  }

  /**
   * Append to an array variable
   */
  async appendToVariable(
    sessionId: string,
    tenantId: string,
    variableName: string,
    value: any
  ) {
    const current = await this.getVariable(sessionId, tenantId, variableName) || [];
    if (!Array.isArray(current)) {
      throw new Error(`Variable ${variableName} is not an array`);
    }
    const updated = [...current, value];
    return this.setVariable(sessionId, tenantId, variableName, updated);
  }

  /**
   * Get session context with metadata
   */
  async getSessionContext(sessionId: string, tenantId: string): Promise<VariableStore | null> {
    return this._getStore(sessionId, tenantId);
  }

  /**
   * Internal: Get store from Redis or DB
   */
  private async _getStore(sessionId: string, tenantId: string): Promise<VariableStore | null> {
    const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}`;
    
    // Try Redis
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Try database
    const context = await prisma.sessionContext.findUnique({
      where: { sessionId },
    });

    if (context) {
      return {
        sessionId,
        tenantId,
        variables: context.variables,
        metadata: context.metadata,
      };
    }

    return null;
  }

  /**
   * Internal: Schedule cleanup of expired variables
   */
  private _scheduleExpiredVariableCleanup(sessionId: string, tenantId: string) {
    // This would be called periodically or when accessed
    // In production, use a job queue (BullMQ) for this
    setTimeout(() => {
      this._cleanupExpiredVariables(sessionId, tenantId);
    }, 5000);
  }

  /**
   * Internal: Cleanup expired variables
   */
  private async _cleanupExpiredVariables(sessionId: string, tenantId: string) {
    const store = await this._getStore(sessionId, tenantId);
    if (!store) return;

    let hasChanges = false;

    for (const variableName of Object.keys(store.variables)) {
      const expiryKey = `${this.REDIS_PREFIX}${tenantId}:${sessionId}:expiry:${variableName}`;
      const hasExpired = !(await redis.exists(expiryKey));
      
      if (hasExpired) {
        delete store.variables[variableName];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}`;
      store.metadata.updatedAt = new Date().toISOString();
      await redis.setex(key, this.REDIS_TTL, JSON.stringify(store));
      
      await prisma.sessionContext.update({
        where: { sessionId },
        data: {
          variables: store.variables,
          metadata: store.metadata,
        },
      });
    }
  }
}

export const variableManager = new VariableManager();
