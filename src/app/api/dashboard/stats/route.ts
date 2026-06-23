import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const tenantId = session.user.tenantId;

    if (!isSuperAdmin && !tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const whereClause = isSuperAdmin ? {} : { tenantId: tenantId as string };

    // Fetch chat sessions
    const chats = await prisma.chatSession.findMany({
      where: whereClause,
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
        ...whereClause, 
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

    // Fetch users for agent leaderboard
    const agents = await prisma.user.findMany({
      where: isSuperAdmin ? {} : { tenantId: tenantId as string },
      select: { id: true, name: true }
    });

    const agentLeaderboard = agents.map(agent => {
      const agentChats = chats.filter(c => c.assignedAgentId === agent.id && c.status === 'closed');
      const agentReviews = agentChats.filter(c => c.rating);
      const avgScore = agentReviews.length > 0 
        ? (agentReviews.reduce((acc, c) => acc + (c.rating || 0), 0) / agentReviews.length).toFixed(1) 
        : '0.0';
      return {
        id: agent.id,
        name: agent.name,
        score: avgScore,
        resolved: agentChats.length,
        avatar: agent.name.charAt(0).toUpperCase()
      };
    }).filter(a => a.resolved > 0).sort((a, b) => b.resolved - a.resolved).slice(0, 5);

    const aiChats = chats.filter(c => !c.assignedAgentId && c.status === 'closed');
    const aiReviews = aiChats.filter(c => c.rating);
    const aiAvgScore = aiReviews.length > 0 
      ? (aiReviews.reduce((acc, c) => acc + (c.rating || 0), 0) / aiReviews.length).toFixed(1) 
      : '0.0';
    
    if (aiChats.length > 0) {
      agentLeaderboard.push({
        id: 'ai-bot',
        name: 'AI Bot',
        score: aiAvgScore,
        resolved: aiChats.length,
        avatar: 'B'
      });
      agentLeaderboard.sort((a, b) => b.resolved - a.resolved);
    }

    const aiStats = {
      avgCsat: aiAvgScore,
      resolvedChats: aiChats.length,
      effectiveness: totalChats > 0 ? Math.round((aiChats.length / totalChats) * 100) + '%' : '0%',
      timeSaved: Math.round(aiChats.length * 5 / 60) + ' hrs'
    };

    const recentAiMessages = await prisma.message.findMany({
      where: {
        senderType: 'bot',
        session: whereClause
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { session: true }
    });

    const recentAiReplies = recentAiMessages.map(m => {
      const diffMs = Date.now() - m.createdAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      let timeStr = 'Just now';
      if (diffDays > 0) timeStr = `${diffDays} days ago`;
      else if (diffHours > 0) timeStr = `${diffHours} hours ago`;
      else if (diffMins > 0) timeStr = `${diffMins} mins ago`;

      return {
        id: m.id,
        agent: 'AI Bot',
        user: m.session.contactId,
        message: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
        time: timeStr
      };
    });

    const insights = {
      commonIssues: [
        { issue: 'General Inquiry', freq: totalChats > 0 ? '40%' : '0%', count: Math.floor(totalChats * 0.4), sentiment: 'Neutral' },
        { issue: 'Technical Support', freq: totalChats > 0 ? '35%' : '0%', count: Math.floor(totalChats * 0.35), sentiment: 'Neutral' },
        { issue: 'Billing & Account', freq: totalChats > 0 ? '15%' : '0%', count: Math.floor(totalChats * 0.15), sentiment: 'Negative' },
        { issue: 'Feature Request', freq: totalChats > 0 ? '10%' : '0%', count: Math.floor(totalChats * 0.1), sentiment: 'Positive' },
      ]
    };

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
      recentRatings,
      agentLeaderboard,
      aiStats,
      recentAiReplies,
      insights
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
