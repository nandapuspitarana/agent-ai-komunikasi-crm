import { NextResponse } from 'next/server';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = (session.user as any).tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const classification = searchParams.get('classification') || '';
    const minScore = parseInt(searchParams.get('minScore') || '0');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (classification) {
      where.leadClassification = classification;
    }
    
    if (minScore > 0) {
      where.leadScore = { gte: minScore };
    }

    // Run query in parallel
    const [data, total] = await Promise.all([
      prisma.visitorProfile.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.visitorProfile.count({ where }),
    ]);

    // Calculate stats
    const [totalCount, hotLeadsCount, bookingReadyCount, scoreStats] = await Promise.all([
      prisma.visitorProfile.count({ where: { tenantId } }),
      prisma.visitorProfile.count({ where: { tenantId, leadClassification: 'hot_lead' } }),
      prisma.visitorProfile.count({ where: { tenantId, leadClassification: 'booking' } }),
      prisma.visitorProfile.aggregate({
        where: { tenantId, leadScore: { gt: 0 } },
        _avg: { leadScore: true }
      })
    ]);

    const stats = {
      total: totalCount,
      hot_leads: hotLeadsCount,
      booking_ready: bookingReadyCount,
      avg_score: Math.round(scoreStats._avg.leadScore || 0)
    };

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      stats
    });
  } catch (error: any) {
    console.error('Error in GET /api/visitors:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
