import { PrismaClient } from '@prisma/client';
import { redis } from '@/lib/redis-session';

const prisma = new PrismaClient();

/**
 * Fallback Logic for Flow Builder
 * Handles timeouts and fallback routing to human agents
 */

export interface FallbackConfig {
  enabled: boolean;
  timeoutSeconds: number;
  maxRetries: number;
  retryDelayMs: number;
  fallbackMessage: string;
  assignToAgent: boolean;
  escalationLevel?: 'standard' | 'priority' | 'urgent';
}

export interface FallbackContext {
  sessionId: string;
  tenantId: string;
  flowId: string;
  nodeId: string;
  reason: 'timeout' | 'error' | 'manual' | 'no_response';
  originalError?: string;
  retryCount: number;
  timestamp: string;
}

export class FallbackHandler {
  private readonly REDIS_PREFIX = 'fallback:';
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Initialize fallback monitoring for a flow execution
   */
  async initializeFallback(
    sessionId: string,
    tenantId: string,
    flowId: string,
    config: Partial<FallbackConfig> = {}
  ): Promise<FallbackConfig> {
    const defaultConfig: FallbackConfig = {
      enabled: true,
      timeoutSeconds: 30,
      maxRetries: 2,
      retryDelayMs: 5000,
      fallbackMessage: 'I understand. Let me connect you with a specialist who can better assist you.',
      assignToAgent: true,
      escalationLevel: 'standard',
      ...config,
    };

    // Store config in Redis for quick access
    const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}:config`;
    await redis.setex(
      key,
      3600, // 1 hour TTL
      JSON.stringify(defaultConfig)
    );

    // Store execution context
    const contextKey = `${this.REDIS_PREFIX}${tenantId}:${sessionId}:context`;
    await redis.setex(
      contextKey,
      3600,
      JSON.stringify({
        flowId,
        nodeId: null,
        retryCount: 0,
        startTime: Date.now(),
      })
    );

    return defaultConfig;
  }

  /**
   * Monitor flow execution for timeout
   */
  async monitorExecution(
    sessionId: string,
    tenantId: string,
    executionPromise: Promise<any>,
    config: FallbackConfig
  ): Promise<{ success: boolean; result?: any; fallbackTriggered: boolean }> {
    try {
      if (!config.enabled) {
        return { success: true, result: await executionPromise, fallbackTriggered: false };
      }

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Flow execution timeout')),
          config.timeoutSeconds * 1000
        )
      );

      try {
        // Race between execution and timeout
        const result = await Promise.race([executionPromise, timeoutPromise]);
        return { success: true, result, fallbackTriggered: false };
      } catch (error) {
        // Timeout occurred, trigger fallback
        console.log(`[Fallback] Timeout triggered for session ${sessionId}`);
        return await this.triggerFallback(
          sessionId,
          tenantId,
          {
            reason: 'timeout',
            originalError: error instanceof Error ? error.message : String(error),
          }
        );
      }
    } catch (error) {
      console.error('[Fallback] Monitor execution error:', error);
      return { success: false, fallbackTriggered: false };
    }
  }

  /**
   * Trigger fallback routing
   */
  async triggerFallback(
    sessionId: string,
    tenantId: string,
    options: Partial<FallbackContext> = {}
  ): Promise<{ success: boolean; result?: any; fallbackTriggered: boolean }> {
    try {
      // Get config and context
      const config = await this._getConfig(sessionId, tenantId);
      const context = await this._getContext(sessionId, tenantId);

      if (!config || !context) {
        console.warn('[Fallback] Missing config or context');
        return { success: false, fallbackTriggered: false };
      }

      const reason = (options.reason || 'error') as FallbackContext['reason'];

      // Check if we should retry before falling back
      if (
        reason === 'timeout' &&
        context.retryCount < config.maxRetries
      ) {
        return await this._retryExecution(sessionId, tenantId, config, context);
      }

      // Log fallback event
      await this._logFallbackEvent({
        sessionId,
        tenantId,
        flowId: context.flowId,
        nodeId: context.nodeId,
        reason,
        originalError: options.originalError,
        retryCount: context.retryCount,
        timestamp: new Date().toISOString(),
      });

      // Route to human agent if configured
      if (config.assignToAgent) {
        return await this._escalateToAgent(
          sessionId,
          tenantId,
          config,
          context,
          reason
        );
      }

      // Otherwise, return fallback message
      return {
        success: true,
        result: {
          message: config.fallbackMessage,
          fallbackMessage: true,
        },
        fallbackTriggered: true,
      };

    } catch (error) {
      console.error('[Fallback] Trigger fallback error:', error);
      return { success: false, fallbackTriggered: false };
    }
  }

  /**
   * Retry flow execution
   */
  private async _retryExecution(
    sessionId: string,
    tenantId: string,
    config: FallbackConfig,
    context: any
  ): Promise<{ success: boolean; result?: any; fallbackTriggered: boolean }> {
    try {
      console.log(
        `[Fallback] Retrying execution for ${sessionId} (attempt ${context.retryCount + 1}/${config.maxRetries})`
      );

      // Increment retry count
      const newRetryCount = context.retryCount + 1;
      const contextKey = `${this.REDIS_PREFIX}${tenantId}:${sessionId}:context`;
      context.retryCount = newRetryCount;
      await redis.setex(contextKey, 3600, JSON.stringify(context));

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, config.retryDelayMs));

      // Log retry event
      await prisma.fallbackLog.create({
        data: {
          sessionId,
          tenantId,
          reason: 'retry_attempt',
          retryCount: newRetryCount,
          maxRetries: config.maxRetries,
          data: { delay: config.retryDelayMs },
          timestamp: new Date(),
        },
      });

      // Return signal to retry (caller will need to handle actual retry)
      return {
        success: true,
        result: { retry: true, attempt: newRetryCount },
        fallbackTriggered: false,
      };

    } catch (error) {
      console.error('[Fallback] Retry execution error:', error);
      return { success: false, fallbackTriggered: false };
    }
  }

  /**
   * Escalate to human agent
   */
  private async _escalateToAgent(
    sessionId: string,
    tenantId: string,
    config: FallbackConfig,
    context: any,
    reason: string
  ): Promise<{ success: boolean; result?: any; fallbackTriggered: boolean }> {
    try {
      console.log(`[Fallback] Escalating ${sessionId} to human agent`);

      // Find available agent
      const agent = await prisma.agent.findFirst({
        where: {
          tenantId,
          status: 'available',
        },
        orderBy: {
          lastAssignedAt: 'asc',
        },
      });

      if (!agent) {
        console.warn('[Fallback] No available agents, queuing for later');
        return await this._queueForAgent(sessionId, tenantId, config, reason);
      }

      // Create assignment
      const assignment = await prisma.agentAssignment.create({
        data: {
          sessionId,
          agentId: agent.id,
          tenantId,
          assignedAt: new Date(),
          status: 'active',
          priority: config.escalationLevel === 'urgent' ? 'high' : 'normal',
          reason: `Fallback: ${reason}`,
        },
      });

      // Update agent status
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: 'busy',
          lastAssignedAt: new Date(),
        },
      });

      // Log escalation
      await this._logFallbackEvent({
        sessionId,
        tenantId,
        flowId: context.flowId,
        nodeId: context.nodeId,
        reason: 'escalated_to_agent',
        originalError: `Assigned to agent: ${agent.name}`,
        retryCount: context.retryCount,
        timestamp: new Date().toISOString(),
      });

      // Emit to agent via Socket.io
      const io = (global as any).socketIO;
      if (io) {
        io.to(`agent:${agent.id}`).emit('incoming_escalation', {
          sessionId,
          reason,
          fallback: true,
          priority: config.escalationLevel,
          message: config.fallbackMessage,
        });
      }

      return {
        success: true,
        result: {
          escalated: true,
          agentId: agent.id,
          agentName: agent.name,
          message: config.fallbackMessage,
        },
        fallbackTriggered: true,
      };

    } catch (error) {
      console.error('[Fallback] Escalate to agent error:', error);
      return { success: false, fallbackTriggered: false };
    }
  }

  /**
   * Queue for agent when none available
   */
  private async _queueForAgent(
    sessionId: string,
    tenantId: string,
    config: FallbackConfig,
    reason: string
  ): Promise<{ success: boolean; result?: any; fallbackTriggered: boolean }> {
    try {
      // Create queue entry
      const queueItem = await prisma.messageQueue.create({
        data: {
          sessionId,
          tenantId,
          message: config.fallbackMessage,
          sender: 'system',
          channel: 'widget',
          status: 'pending',
          priority: config.escalationLevel === 'urgent' ? 'high' : 'normal',
          metadata: {
            reason,
            fallback: true,
          },
        },
      });

      // Add to Redis queue
      const queueKey = `fallback:queue:${tenantId}`;
      await redis.lpush(
        queueKey,
        JSON.stringify({
          queueId: queueItem.id,
          sessionId,
          reason,
        })
      );

      return {
        success: true,
        result: {
          queued: true,
          queueId: queueItem.id,
          message: 'Your message has been queued. An agent will respond soon.',
        },
        fallbackTriggered: true,
      };

    } catch (error) {
      console.error('[Fallback] Queue for agent error:', error);
      return { success: false, fallbackTriggered: false };
    }
  }

  /**
   * Get fallback status for a session
   */
  async getFallbackStatus(
    sessionId: string,
    tenantId: string
  ): Promise<{ hasFallback: boolean; status: any }> {
    try {
      const fallbackLog = await prisma.fallbackLog.findFirst({
        where: { sessionId, tenantId },
        orderBy: { timestamp: 'desc' },
      });

      return {
        hasFallback: !!fallbackLog,
        status: fallbackLog,
      };
    } catch (error) {
      console.error('[Fallback] Get status error:', error);
      return { hasFallback: false, status: null };
    }
  }

  /**
   * Clear fallback state for a session
   */
  async clearFallback(sessionId: string, tenantId: string): Promise<void> {
    try {
      const keys = [
        `${this.REDIS_PREFIX}${tenantId}:${sessionId}:config`,
        `${this.REDIS_PREFIX}${tenantId}:${sessionId}:context`,
      ];

      for (const key of keys) {
        await redis.del(key);
      }

      console.log(`[Fallback] Cleared fallback state for ${sessionId}`);
    } catch (error) {
      console.error('[Fallback] Clear fallback error:', error);
    }
  }

  /**
   * Internal: Get config from Redis
   */
  private async _getConfig(
    sessionId: string,
    tenantId: string
  ): Promise<FallbackConfig | null> {
    try {
      const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}:config`;
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[Fallback] Get config error:', error);
      return null;
    }
  }

  /**
   * Internal: Get context from Redis
   */
  private async _getContext(
    sessionId: string,
    tenantId: string
  ): Promise<any | null> {
    try {
      const key = `${this.REDIS_PREFIX}${tenantId}:${sessionId}:context`;
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[Fallback] Get context error:', error);
      return null;
    }
  }

  /**
   * Internal: Log fallback event
   */
  private async _logFallbackEvent(payload: any): Promise<void> {
    try {
      await prisma.fallbackLog.create({
        data: {
          sessionId: payload.sessionId,
          tenantId: payload.tenantId,
          reason: payload.reason,
          retryCount: payload.retryCount,
          maxRetries: payload.maxRetries || 0,
          data: {
            flowId: payload.flowId,
            nodeId: payload.nodeId,
            originalError: payload.originalError,
          },
          timestamp: new Date(payload.timestamp),
        },
      });
    } catch (error) {
      console.error('[Fallback] Log event error:', error);
    }
  }
}

export const fallbackHandler = new FallbackHandler();
