import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    // Fetch chat sessions for the tenant
    const chats = await prisma.chatSession.findMany({
      where: { tenantId },
      include: {
        messages: {
          select: { id: true }
        }
      }
    });

    const totalChats = chats.length;
    const resolvedChats = chats.filter(c => c.status === 'closed').length;
    const pendingChats = chats.filter(c => c.status === 'queue').length;
    const inProgressChats = chats.filter(c => c.status === 'bot' || c.status === 'agent').length;

    // Calculate CSAT
    const reviewedChats = chats.filter(c => c.rating !== null && c.rating !== undefined);
    const totalReviews = reviewedChats.length;
    
    let averageRating = 0;
    let distribution = [
      { stars: 5, percentage: 0 },
      { stars: 4, percentage: 0 },
      { stars: 3, percentage: 0 },
      { stars: 2, percentage: 0 },
      { stars: 1, percentage: 0 },
    ];

    if (totalReviews > 0) {
      const sum = reviewedChats.reduce((acc, c) => acc + (c.rating || 0), 0);
      averageRating = Number((sum / totalReviews).toFixed(1));

      // Calculate distribution
      [5, 4, 3, 2, 1].forEach(star => {
        const count = reviewedChats.filter(c => c.rating === star).length;
        const index = distribution.findIndex(d => d.stars === star);
        if (index !== -1) {
          distribution[index].percentage = Math.round((count / totalReviews) * 100);
        }
      });
    }

    // Recent reviews
    const recentReviewsRaw = await prisma.chatSession.findMany({
      where: { 
        tenantId, 
        rating: { not: null } 
      },
      orderBy: { closedAt: 'desc' },
      take: 5
    });

    const recentRatings = recentReviewsRaw.map(r => {
      // Menghitung selisih waktu sederhana (mocked display format)
      const diffMs = Date.now() - (r.closedAt?.getTime() || r.updatedAt.getTime());
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      let timeStr = 'Just now';
      if (diffDays > 0) timeStr = `${diffDays} days ago`;
      else if (diffHours > 0) timeStr = `${diffHours} hours ago`;
      else if (diffMins > 0) timeStr = `${diffMins} mins ago`;

      return {
        id: r.id,
        user: r.contactId, // Idealnya diganti nama user jika ada
        rating: r.rating || 0,
        comment: r.review || '-',
        time: timeStr,
        channel: r.channel
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalChats,
        resolvedChats,
        pendingChats,
        inProgressChats
      },
      csat: {
        average: averageRating.toString(),
        totalReviews,
        distribution
      },
      recentRatings
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
