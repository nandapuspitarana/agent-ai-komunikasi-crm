import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { logPasswordResetRequested } from '@/lib/audit-logger';

const prisma = new PrismaClient();

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a reset link will be sent',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a reset link will be sent',
      });
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Create password reset token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Log audit
    await logPasswordResetRequested(
      user.id,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    );

    // TODO: Send email with reset link
    // For now, return the token (in production, this should be sent via email)
    console.log('Password reset token:', token);
    console.log('Reset link: http://localhost:3101/reset-password?token=' + token);

    return NextResponse.json({
      success: true,
      message: 'If the email exists, a reset link will be sent',
      // Remove this in production
      token: process.env.NODE_ENV === 'development' ? token : undefined,
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
