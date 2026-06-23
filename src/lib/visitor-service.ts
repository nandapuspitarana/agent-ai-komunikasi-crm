import { VisitorConfig } from './visitor-config';
import { ExtractedVisitorData } from './visitor-extractor';

import { prisma } from '@/lib/prisma';

import { getVisitorConfig } from './visitor-config';

// Data Retention: A cron job can call cleanUpStaleVisitors() to clean up VisitorProfile 
// records where lastSeenAt < (now - visitorConfig.retentionDays).

export async function upsertVisitorProfile(tenantId: string, contactId: string, initialData?: any) {
  try {
    const existing = await prisma.visitorProfile.findUnique({
      where: {
        tenantId_contactId: {
          tenantId,
          contactId
        }
      }
    });

    if (existing) {
      return existing;
    }

    return await prisma.visitorProfile.create({
      data: {
        tenantId,
        contactId,
        ...initialData,
        sessions: 1,
        messageCount: 0
      }
    });
  } catch (error) {
    console.error('[VisitorService] Error upserting visitor profile', error);
    return null;
  }
}

export async function updateVisitorFromExtraction(
  tenantId: string, 
  contactId: string, 
  data: ExtractedVisitorData
) {
  const hasData = data.name || data.email || data.phone || (data.metadata && Object.keys(data.metadata).length > 0);
  if (!hasData) return null;

  try {
    const current = await prisma.visitorProfile.findUnique({
      where: { tenantId_contactId: { tenantId, contactId } }
    });

    if (!current) {
      // Create if it doesn't exist, store initial metadata
      const initialMetadata = data.metadata ? { ...data.metadata } : {};
      await upsertVisitorProfile(tenantId, contactId, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        metadata: initialMetadata,
      });
      return { success: true, updated: true, created: true };
    }

    const updateData: any = {};
    if (data.name && !current.name) updateData.name = data.name;
    if (data.email && !current.email) updateData.email = data.email;
    if (data.phone && !current.phone) updateData.phone = data.phone;

    // Merge custom metadata (always add new keys, update existing)
    if (data.metadata && Object.keys(data.metadata).length > 0) {
      // Normalize: metadata column might be [] (default) or {} (object)
      const existingMeta: Record<string, any> = 
        current.metadata && !Array.isArray(current.metadata) && typeof current.metadata === 'object'
          ? (current.metadata as Record<string, any>)
          : {};
      updateData.metadata = { ...existingMeta, ...data.metadata };
    }

    if (Object.keys(updateData).length === 0) return current;

    return await prisma.visitorProfile.update({
      where: { id: current.id },
      data: updateData
    });
  } catch (error) {
    console.error('[VisitorService] Error updating visitor from extraction', error);
    return null;
  }
}

export async function updateVisitorClassification(
  tenantId: string,
  contactId: string,
  classification: string,
  config: VisitorConfig
) {
  if (!config.enabled || !config.layer4_classification) return null;

  try {
    const current = await prisma.visitorProfile.findUnique({
      where: { tenantId_contactId: { tenantId, contactId } }
    });

    // @ts-ignore
    const scoreDelta = config.scoreWeights[classification] || 0;

    if (!current) {
      // Create if it doesn't exist
      await upsertVisitorProfile(tenantId, contactId, {
        leadClassification: classification,
        lastIntent: classification,
        leadScore: scoreDelta
      });
      return { success: true, created: true };
    }

    // Only update if classification changed OR score increased on weight
    // @ts-ignore
    const weight = config.scoreWeights[classification] || 0;
    const newScore = Math.min(100, current.leadScore + weight);

    // Track topics
    const topics = new Set(current.topicsDiscussed || []);
    topics.add(classification);

    return await prisma.visitorProfile.update({
      where: { id: current.id },
      data: {
        leadClassification: classification,
        leadScore: newScore,
        lastIntent: classification,
        topicsDiscussed: Array.from(topics)
      }
    });
  } catch (error) {
    console.error('[VisitorService] Error updating visitor classification', error);
    return null;
  }
}

export async function shouldTriggerLeadForm(
  tenantId: string,
  contactId: string,
  classification: string,
  config: VisitorConfig
): Promise<boolean> {
  if (!config.enabled || !config.layer3_leadform) return false;
  if (classification !== config.leadFormTrigger) return false;

  try {
    const current = await prisma.visitorProfile.findUnique({
      where: { tenantId_contactId: { tenantId, contactId } },
      select: { leadFormShown: true }
    });

    if (!current) return false;
    
    // Trigger if form hasn't been shown yet
    return current.leadFormShown === false;
  } catch (error) {
    console.error('[VisitorService] Error checking lead form trigger', error);
    return false;
  }
}

export async function cleanUpStaleVisitors() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, visitorConfig: true }
    });

    let totalDeleted = 0;

    for (const tenant of tenants) {
      const config = getVisitorConfig(tenant.visitorConfig);
      if (config.retentionDays && config.retentionDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

        const result = await prisma.visitorProfile.deleteMany({
          where: {
            tenantId: tenant.id,
            lastSeenAt: {
              lt: cutoffDate
            }
          }
        });

        totalDeleted += result.count;
      }
    }

    console.log(`[VisitorService] Cleaned up ${totalDeleted} stale visitor profiles.`);
    return { success: true, deletedCount: totalDeleted };
  } catch (error) {
    console.error('[VisitorService] Error cleaning up stale visitors:', error);
    return { success: false, error: 'Failed to clean up stale visitors' };
  }
}
