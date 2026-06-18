import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface VariableStore {
  sessionId: string;
  tenantId: string;
  variables: Record<string, any>;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

interface DBContextPayload {
  variables: Record<string, any>;
  expirations: Record<string, string>; // Maps variableName to ISO String expiration date
}

export class VariableManager {
  /**
   * Initialize variable store for a session
   */
  async initializeSession(sessionId: string, tenantId: string, initialVars?: Record<string, any>) {
    const payload: DBContextPayload = {
      variables: initialVars || {},
      expirations: {},
    };

    const context = await prisma.sessionContext.upsert({
      where: {
        tenantId_sessionId: {
          tenantId,
          sessionId,
        },
      },
      create: {
        tenantId,
        sessionId,
        data: payload as any,
      },
      update: {
        data: payload as any,
      },
    });

    return {
      sessionId,
      tenantId,
      variables: payload.variables,
      metadata: {
        createdAt: context.createdAt.toISOString(),
        updatedAt: context.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Get all variables for a session
   */
  async getVariables(sessionId: string, tenantId: string): Promise<Record<string, any>> {
    const store = await this._getStore(sessionId, tenantId);
    return store ? store.variables : {};
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
    const currentStore = await this._getStore(sessionId, tenantId);
    const variables = currentStore ? currentStore.variables : {};
    
    // Check if there's any existing payload to retrieve expirations
    const context = await prisma.sessionContext.findUnique({
      where: { tenantId_sessionId: { tenantId, sessionId } },
    });
    
    const expirations = context && context.data ? ((context.data as any).expirations || {}) : {};
    
    variables[variableName] = value;
    // If it had an expiration, clean it up since it's set fresh
    delete expirations[variableName];

    const payload: DBContextPayload = {
      variables,
      expirations,
    };

    await prisma.sessionContext.upsert({
      where: { tenantId_sessionId: { tenantId, sessionId } },
      create: {
        tenantId,
        sessionId,
        data: payload as any,
      },
      update: {
        data: payload as any,
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
    const currentStore = await this._getStore(sessionId, tenantId);
    const variables = {
      ...(currentStore ? currentStore.variables : {}),
      ...updates,
    };

    const context = await prisma.sessionContext.findUnique({
      where: { tenantId_sessionId: { tenantId, sessionId } },
    });
    const expirations = context && context.data ? ((context.data as any).expirations || {}) : {};
    
    // Remove expiration for updated keys
    for (const key of Object.keys(updates)) {
      delete expirations[key];
    }

    const payload: DBContextPayload = {
      variables,
      expirations,
    };

    await prisma.sessionContext.upsert({
      where: { tenantId_sessionId: { tenantId, sessionId } },
      create: {
        tenantId,
        sessionId,
        data: payload as any,
      },
      update: {
        data: payload as any,
      },
    });

    return variables;
  }

  /**
   * Delete a variable
   */
  async deleteVariable(sessionId: string, tenantId: string, variableName: string) {
    const context = await prisma.sessionContext.findUnique({
      where: { tenantId_sessionId: { tenantId, sessionId } },
    });
    if (!context || !context.data) return;

    const data = context.data as any as DBContextPayload;
    const variables = data.variables || {};
    const expirations = data.expirations || {};

    delete variables[variableName];
    delete expirations[variableName];

    await prisma.sessionContext.update({
      where: { tenantId_sessionId: { tenantId, sessionId } },
      data: {
        data: {
          variables,
          expirations,
        } as any,
      },
    });
  }

  /**
   * Clear all variables for a session
   */
  async clearSession(sessionId: string, tenantId: string) {
    await prisma.sessionContext.delete({
      where: { tenantId_sessionId: { tenantId, sessionId } },
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
    const context = await prisma.sessionContext.findUnique({
      where: { tenantId_sessionId: { tenantId, sessionId } },
    });
    if (!context || !context.data) return;

    const data = context.data as any as DBContextPayload;
    const variables = data.variables || {};
    const expirations = data.expirations || {};

    if (variables[variableName] === undefined) return;

    expirations[variableName] = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    await prisma.sessionContext.update({
      where: { tenantId_sessionId: { tenantId, sessionId } },
      data: {
        data: {
          variables,
          expirations,
        } as any,
      },
    });
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
   * Internal: Get store from DB and check expiration
   */
  private async _getStore(sessionId: string, tenantId: string): Promise<VariableStore | null> {
    const context = await prisma.sessionContext.findUnique({
      where: { tenantId_sessionId: { tenantId, sessionId } },
    });

    if (!context || !context.data) {
      return null;
    }

    const data = context.data as any as DBContextPayload;
    const variables = data.variables || {};
    const expirations = data.expirations || {};
    
    let hasChanges = false;
    const now = new Date();

    for (const [key, expireAtStr] of Object.entries(expirations)) {
      if (new Date(expireAtStr) < now) {
        delete variables[key];
        delete expirations[key];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await prisma.sessionContext.update({
        where: { tenantId_sessionId: { tenantId, sessionId } },
        data: {
          data: {
            variables,
            expirations,
          } as any,
        },
      });
    }

    return {
      sessionId,
      tenantId,
      variables,
      metadata: {
        createdAt: context.createdAt.toISOString(),
        updatedAt: context.updatedAt.toISOString(),
      },
    };
  }
}

export const variableManager = new VariableManager();
