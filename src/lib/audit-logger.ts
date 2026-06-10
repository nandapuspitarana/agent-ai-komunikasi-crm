import { PrismaClient, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditLogData {
  action: AuditAction;
  userId?: string;
  performedById?: string;
  entityType: string;
  entityId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    return await prisma.auditLog.create({
      data: {
        action: data.action,
        userId: data.userId,
        performedById: data.performedById,
        entityType: data.entityType,
        entityId: data.entityId,
        changes: data.changes || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the app
    return null;
  }
}

/**
 * Log user creation
 */
export async function logUserCreated(
  userId: string,
  performedById: string,
  userData: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'USER_CREATED',
    userId,
    performedById,
    entityType: 'User',
    entityId: userId,
    changes: { new: userData },
    ipAddress,
    userAgent,
  });
}

/**
 * Log user update
 */
export async function logUserUpdated(
  userId: string,
  performedById: string,
  oldData: any,
  newData: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'USER_UPDATED',
    userId,
    performedById,
    entityType: 'User',
    entityId: userId,
    changes: { old: oldData, new: newData },
    ipAddress,
    userAgent,
  });
}

/**
 * Log user deletion
 */
export async function logUserDeleted(
  userId: string,
  performedById: string,
  userData: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'USER_DELETED',
    userId,
    performedById,
    entityType: 'User',
    entityId: userId,
    changes: { old: userData },
    ipAddress,
    userAgent,
  });
}

/**
 * Log user login
 */
export async function logUserLogin(
  userId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'USER_LOGIN',
    userId,
    performedById: userId,
    entityType: 'User',
    entityId: userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log user logout
 */
export async function logUserLogout(
  userId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'USER_LOGOUT',
    userId,
    performedById: userId,
    entityType: 'User',
    entityId: userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log password change
 */
export async function logPasswordChanged(
  userId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'PASSWORD_CHANGED',
    userId,
    performedById: userId,
    entityType: 'User',
    entityId: userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log password reset request
 */
export async function logPasswordResetRequested(
  userId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'PASSWORD_RESET_REQUESTED',
    userId,
    performedById: userId,
    entityType: 'User',
    entityId: userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log password reset completion
 */
export async function logPasswordResetCompleted(
  userId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'PASSWORD_RESET_COMPLETED',
    userId,
    performedById: userId,
    entityType: 'User',
    entityId: userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log role change
 */
export async function logRoleChanged(
  userId: string,
  performedById: string,
  oldRole: string,
  newRole: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'ROLE_CHANGED',
    userId,
    performedById,
    entityType: 'User',
    entityId: userId,
    changes: { old: { role: oldRole }, new: { role: newRole } },
    ipAddress,
    userAgent,
  });
}

/**
 * Log status change
 */
export async function logStatusChanged(
  userId: string,
  performedById: string,
  oldStatus: boolean,
  newStatus: boolean,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'STATUS_CHANGED',
    userId,
    performedById,
    entityType: 'User',
    entityId: userId,
    changes: { old: { isActive: oldStatus }, new: { isActive: newStatus } },
    ipAddress,
    userAgent,
  });
}

/**
 * Log document upload
 */
export async function logDocumentUploaded(
  userId: string,
  documentData: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'DOCUMENT_UPLOADED',
    userId,
    performedById: userId,
    entityType: 'Document',
    entityId: documentData.id,
    changes: { new: documentData },
    ipAddress,
    userAgent,
  });
}

/**
 * Log document deletion
 */
export async function logDocumentDeleted(
  userId: string,
  documentData: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'DOCUMENT_DELETED',
    userId,
    performedById: userId,
    entityType: 'Document',
    entityId: documentData.id,
    changes: { old: documentData },
    ipAddress,
    userAgent,
  });
}

/**
 * Log AI agent created
 */
export async function logAIAgentCreated(
  userId: string,
  agentData: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'AI_AGENT_CREATED',
    userId,
    performedById: userId,
    entityType: 'Flow',
    entityId: agentData.id,
    changes: { new: agentData },
    ipAddress,
    userAgent,
  });
}

/**
 * Log AI agent updated
 */
export async function logAIAgentUpdated(
  userId: string,
  oldData: any,
  newData: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'AI_AGENT_UPDATED',
    userId,
    performedById: userId,
    entityType: 'Flow',
    entityId: newData.id,
    changes: { old: oldData, new: newData },
    ipAddress,
    userAgent,
  });
}

/**
 * Log AI agent deleted
 */
export async function logAIAgentDeleted(
  userId: string,
  agentData: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'AI_AGENT_DELETED',
    userId,
    performedById: userId,
    entityType: 'Flow',
    entityId: agentData.id,
    changes: { old: agentData },
    ipAddress,
    userAgent,
  });
}

/**
 * Log data imported
 */
export async function logDataImported(
  userId: string,
  entityType: string,
  changes: any,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'DATA_IMPORTED',
    userId,
    performedById: userId,
    entityType,
    changes,
    ipAddress,
    userAgent,
  });
}

/**
 * Log data exported
 */
export async function logDataExported(
  userId: string,
  entityType: string,
  entityId: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'DATA_EXPORTED',
    userId,
    performedById: userId,
    entityType,
    entityId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log chat message sent
 */
export async function logChatMessageSent(
  userId: string,
  sessionId: string,
  messageContent: string,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    action: 'CHAT_MESSAGE_SENT',
    userId,
    performedById: userId,
    entityType: 'ChatSession',
    entityId: sessionId,
    changes: { message: messageContent },
    ipAddress,
    userAgent,
  });
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(userId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: { userId },
    include: {
      performedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get all audit logs with pagination
 */
export async function getAllAuditLogs(page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count(),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
