import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  logUserUpdated,
  logUserDeleted,
  logRoleChanged,
  logStatusChanged,
  getUserAuditLogs,
} from '@/lib/audit-logger';
import { canAccessAdminPanel } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/users/[id] - Get single user with audit logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (await params).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check access
    let isAllowed = false;
    if (session.user.role === 'SUPER_ADMIN') {
      isAllowed = true;
    } else if (session.user.id === userId) {
      isAllowed = true;
    } else if (session.user.role === 'BUSINESS_PARTNER' && user.tenantId === session.user.tenantId) {
      isAllowed = true;
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get audit logs (only for Super Admin or own profile)
    let auditLogs: any[] = [];
    if (canAccessAdminPanel(session.user.role) || session.user.id === userId) {
      auditLogs = await getUserAuditLogs(userId, 50);
    }

    return NextResponse.json({ user, auditLogs });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (await params).id;

    const body = await request.json();
    const { name, email, role, tenantId, isActive } = body;

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check access
    let isAllowed = false;
    if (session.user.role === 'SUPER_ADMIN') {
      isAllowed = true;
    } else if (session.user.id === userId) {
      isAllowed = true;
    } else if (session.user.role === 'BUSINESS_PARTNER' && existingUser.tenantId === session.user.tenantId) {
      isAllowed = true;
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if email is being changed and already exists
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // Only Super Admin can change role and tenantId
    // Business Partner can only change isActive status of their agents
    if (session.user.role === 'SUPER_ADMIN') {
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (tenantId !== undefined) updateData.tenantId = tenantId;
    } else if (session.user.role === 'BUSINESS_PARTNER') {
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log audit
    await logUserUpdated(
      userId,
      session.user.id,
      {
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        isActive: existingUser.isActive,
        tenantId: existingUser.tenantId,
      },
      {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        tenantId: updatedUser.tenantId,
      },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    );

    // Log specific changes
    if (existingUser.role !== updatedUser.role) {
      await logRoleChanged(
        userId,
        session.user.id,
        existingUser.role,
        updatedUser.role,
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
      );
    }

    if (existingUser.isActive !== updatedUser.isActive) {
      await logStatusChanged(
        userId,
        session.user.id,
        existingUser.isActive,
        updatedUser.isActive,
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
      );
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (await params).id;

    // Prevent self-deletion
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Get user before deletion
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check access
    let isAllowed = false;
    if (session.user.role === 'SUPER_ADMIN') {
      isAllowed = true;
    } else if (session.user.role === 'BUSINESS_PARTNER' && user.tenantId === session.user.tenantId) {
      isAllowed = true;
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    // Log audit
    await logUserDeleted(
      userId,
      session.user.id,
      {
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
