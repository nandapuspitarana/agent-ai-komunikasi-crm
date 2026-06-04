'use client';

import { getRoleBadgeColor, getRoleDisplayName } from '@/lib/auth-utils';

interface RoleBadgeProps {
  role?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${getRoleBadgeColor(
        role
      )} ${sizeClasses[size]}`}
    >
      {getRoleDisplayName(role)}
    </span>
  );
}
