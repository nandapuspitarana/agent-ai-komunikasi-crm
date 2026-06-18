import { PrismaClient } from '@prisma/client';
import { redis } from '@/lib/redis-session';
import { FlowInterpreter } from '@/modules/flow-builder/interpreter';
import { variableManager } from '@/modules/flow-builder/variables';
import { chatWithAgent } from '@/lib/ai-agent';

const prisma = new PrismaClient();

/**
 * Message Router for Chat Engine
 * Routes incoming messages to appropriate flow, agent, or fallback
 */

export interface RoutingContext {
  sessionId: string;
  tenantId: string;
  message: string;
  sender: string;
  senderName: string;
  channel: 'whatsapp' | 'widget' | 'email' | 'sms';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface RoutingResult {
  success: boolean;
  routedTo: 'flow' | 'agent' | 'fallback' | 'queue';
  targetId: string;
  response?: string;
  nextStep?: string;
  error?: string;
}

export class MessageRouter {
  private readonly REDIS_PREFIX = 'router:';

  /**
   * Route incoming message to appropriate destination
   */
  async route(context: RoutingContext): Promise<RoutingResult> {
    try {
      console.log(`[Router] Routing message from ${context.sender} on ${context.channel}`);

      // Get tenant configuration
      const tenant = await prisma.tenant.findUnique({
        where: { id: context.tenantId },
        include: {
          flows: {
            where: { isActive: true },
            orderBy: { priority: 'desc' },
            take: 1,
          },
        },
      });

      if (!tenant) {
        return {
          success: false,
          routedTo: 'fallback',
          targetId: '',
          error: 'Tenant not found',
        };
      }

      // Check if there's an active flow
      if (tenant.flows.length > 0) {
        const flowResult = await this.routeToFlow(context, tenant.flows[0]);
        if (flowResult.success) {
          return flowResult;
        }
        // If flow fails, fall through to AI Agent
      }

      // Check if there are available agents
      const availableAgent = await this.findAvailableAgent(context.tenantId);
      if (availableAgent) {
        return this.routeToAgent(context, availableAgent);
      }

      // Fall back to AI Agent
      return this.routeToAIAgent(context);

    } catch (error) {
      console.error('[Router] Routing error:', error);
      return {
        success: false,
        routedTo: 'fallback',
        targetId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Route message to flow engine
   */
  private async routeToFlow(context: RoutingContext, flow: any): Promise<RoutingResult> {
    try {
      console.log(`[Router] Routing to flow: ${flow.id}`);

      // Get or create session context
      let sessionContext = await variableManager.getSessionContext(context.sessionId, context.tenantId);
      if (!sessionContext) {
        await variableManager.initializeSession(context.sessionId, context.tenantId, {
          sender: context.sender,
          senderName: context.senderName,
          channel: context.channel,
          startTime: context.timestamp,
        });
      }

      // Store message in context
      await variableManager.setVariable(
        context.sessionId,
        context.tenantId,
        'last_message',
        context.message
      );

      // Parse flow JSON
      const flowNodes = flow.flowData?.nodes || [];
      const flowEdges = flow.flowData?.edges || [];

      if (flowNodes.length === 0) {
        return {
          success: false,
          routedTo: 'flow',
          targetId: flow.id,
          error: 'Flow has no nodes',
        };
      }

      // Initialize flow interpreter
      const interpreter = new FlowInterpreter(
        flowNodes,
        flowEdges,
        {
          variables: sessionContext?.variables,
        }
      );

      // Execute flow
      const result = await interpreter.execute(context.message);

      // Save updated context
      if (result.context) {
        await variableManager.updateVariables(
          context.sessionId,
          context.tenantId,
          result.context.variables
        );
      }

      // Log to journey
      await this.logJourney({
        sessionId: context.sessionId,
        tenantId: context.tenantId,
        action: 'flow_executed',
        data: {
          flowId: flow.id,
          input: context.message,
          output: result.response,
          step: result.nextStep,
        },
      });

      // Cache routing for quick recall
      await this.cacheRouting(context.sessionId, {
        routedTo: 'flow',
        targetId: flow.id,
      });

      return {
        success: true,
        routedTo: 'flow',
        targetId: flow.id,
        response: result.response,
        nextStep: result.nextStep,
      };

    } catch (error) {
      console.error('[Router] Flow routing error:', error);
      return {
        success: false,
        routedTo: 'flow',
        targetId: flow.id,
        error: error instanceof Error ? error.message : 'Flow execution failed',
      };
    }
  }

  /**
   * Route message to available agent
   */
  private async routeToAgent(context: RoutingContext, agent: any): Promise<RoutingResult> {
    try {
      console.log(`[Router] Routing to agent: ${agent.id}`);

      // Create or update assignment
      const assignment = await prisma.agentAssignment.upsert({
        where: { sessionId: context.sessionId },
        create: {
          sessionId: context.sessionId,
          agentId: agent.id,
          tenantId: context.tenantId,
          assignedAt: new Date(),
          status: 'active',
        },
        update: {
          agentId: agent.id,
          status: 'active',
          assignedAt: new Date(),
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

      // Log to journey
      await this.logJourney({
        sessionId: context.sessionId,
        tenantId: context.tenantId,
        action: 'routed_to_agent',
        data: {
          agentId: agent.id,
          agentName: agent.name,
          message: context.message,
        },
      });

      // Cache routing
      await this.cacheRouting(context.sessionId, {
        routedTo: 'agent',
        targetId: agent.id,
      });

      // Emit to agent via Socket.io
      this.emitToAgent(agent.id, {
        type: 'new_message',
        sessionId: context.sessionId,
        message: context.message,
        sender: context.senderName,
        channel: context.channel,
      });

      return {
        success: true,
        routedTo: 'agent',
        targetId: agent.id,
        response: `Connected to ${agent.name}`,
      };

    } catch (error) {
      console.error('[Router] Agent routing error:', error);
      return {
        success: false,
        routedTo: 'agent',
        targetId: agent.id,
        error: error instanceof Error ? error.message : 'Agent routing failed',
      };
    }
  }

  /**
   * Route message to AI Agent Proxy
   */
  private async routeToAIAgent(context: RoutingContext): Promise<RoutingResult> {
    try {
      console.log(`[Router] Routing to AI Agent for session: ${context.sessionId}`);

      // Check LLM availability before calling (local model or proxy)
      const { healthCheck } = await import('@/lib/ai-agent');
      const health = await healthCheck();

      if (!health.local && !health.proxy) {
        // No AI endpoints available: queue for later processing
        return await this.queueForLater(context);
      }

      const response = await chatWithAgent({
        message: context.message,
        session_id: context.sessionId,
        user_id: context.sender,
      });

      // Save AI response to database
      await prisma.message.create({
        data: {
          sessionId: context.sessionId,
          senderType: 'bot',
          content: response.reply
        }
      });

      // Log to journey
      await this.logJourney({
        sessionId: context.sessionId,
        tenantId: context.tenantId,
        action: 'ai_agent_replied',
        data: {
          intent: response.intent,
          toolUsed: response.tool_used,
          reply: response.reply,
        },
      });

      return {
        success: true,
        routedTo: 'flow', // Treat AI agent as a flow for consistency
        targetId: 'ai-agent',
        response: response.reply,
      };

    } catch (error) {
      console.error('[Router] AI Agent routing error:', error);
      return {
        success: false,
        routedTo: 'fallback',
        targetId: 'ai-agent',
        error: error instanceof Error ? error.message : 'AI Agent failed',
      };
    }
  }

  /**
   * Queue message for later processing (fallback)
   */
  private async queueForLater(context: RoutingContext): Promise<RoutingResult> {
    try {
      console.log(`[Router] Queueing message for later: ${context.sessionId}`);

      // Save to database
      const queueItem = await prisma.messageQueue.create({
        data: {
          sessionId: context.sessionId,
          tenantId: context.tenantId,
          message: context.message,
          sender: context.sender,
          channel: context.channel,
          status: 'pending',
          metadata: context.metadata || {},
        },
      });

      // Also add to Redis queue for processing
      const queueKey = `queue:${context.tenantId}:messages`;
      await redis.lpush(
        queueKey,
        JSON.stringify({
          queueId: queueItem.id,
          ...context,
        })
      );

      // Log to journey
      await this.logJourney({
        sessionId: context.sessionId,
        tenantId: context.tenantId,
        action: 'queued',
        data: {
          queueId: queueItem.id,
          message: context.message,
        },
      });

      // Cache routing
      await this.cacheRouting(context.sessionId, {
        routedTo: 'queue',
        targetId: queueItem.id,
      });

      return {
        success: true,
        routedTo: 'queue',
        targetId: queueItem.id,
        response: 'Your message has been queued. We will respond soon.',
      };

    } catch (error) {
      console.error('[Router] Queue error:', error);
      return {
        success: false,
        routedTo: 'queue',
        targetId: '',
        error: error instanceof Error ? error.message : 'Queueing failed',
      };
    }
  }

  /**
   * Find available agent for routing
   */
  private async findAvailableAgent(tenantId: string): Promise<any | null> {
    try {
      const agent = await prisma.user.findFirst({
        where: {
          tenantId,
          role: 'AGENT',
          isActive: true,
        },
      });

      return agent;
    } catch (error) {
      console.error('[Router] Error finding available agent:', error);
      return null;
    }
  }

  /**
   * Log journey for audit trail
   */
  private async logJourney(payload: {
    sessionId: string;
    tenantId: string;
    action: string;
    data: Record<string, any>;
  }) {
    try {
      await prisma.journeyLog.create({
        data: {
          sessionId: payload.sessionId,
          tenantId: payload.tenantId,
          action: payload.action,
          data: payload.data,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('[Router] Error logging journey:', error);
    }
  }

  /**
   * Cache routing decision
   */
  private async cacheRouting(
    sessionId: string,
    routingInfo: {
      routedTo: 'flow' | 'agent' | 'queue';
      targetId: string;
    }
  ) {
    try {
      const key = `${this.REDIS_PREFIX}${sessionId}`;
      await redis.setex(key, 3600, JSON.stringify(routingInfo)); // 1 hour TTL
    } catch (error) {
      console.error('[Router] Error caching routing:', error);
    }
  }

  /**
   * Get cached routing for session
   */
  async getCachedRouting(sessionId: string): Promise<any | null> {
    try {
      const key = `${this.REDIS_PREFIX}${sessionId}`;
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[Router] Error getting cached routing:', error);
      return null;
    }
  }

  /**
   * Emit message to agent
   */
  private emitToAgent(agentId: string, payload: any) {
    try {
      // Supabase Realtime handles UI updates automatically
    } catch (error) {
      console.error('[Router] Error emitting to agent:', error);
    }
  }

  /**
   * Handle agent response to routed message
   */
  async handleAgentResponse(
    sessionId: string,
    tenantId: string,
    agentId: string,
    response: string
  ): Promise<boolean> {
    try {
      console.log(`[Router] Processing agent response from ${agentId}`);

      // Save agent response
      await prisma.chatMessage.create({
        data: {
          sessionId,
          tenantId,
          sender: 'agent',
          message: response,
          metadata: {
            agentId,
          },
        },
      });

      // Log to journey
      await this.logJourney({
        sessionId,
        tenantId,
        action: 'agent_response',
        data: {
          agentId,
          response,
        },
      });

      return true;
    } catch (error) {
      console.error('[Router] Error handling agent response:', error);
      return false;
    }
  }
}

export const messageRouter = new MessageRouter();
