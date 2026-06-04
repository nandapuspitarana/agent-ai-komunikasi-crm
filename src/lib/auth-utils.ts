import { UserRole } from '@prisma/client';

export type Role = 'SUPER_ADMIN' | 'AGENT' | 'BUSINESS_PARTNER';

/**
 * Check if user has permission to access admin panel
 */
export function canAccessAdminPanel(role?: string | null): boolean {
  return role === UserRole.SUPER_ADMIN;
}

/**
 * Check if user can manage agents
 */
export function canManageAgents(role?: string | null): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_PARTNER;
}

/**
 * Check if user can view all tenants
 */
export function canViewAllTenants(role?: string | null): boolean {
  return role === UserRole.SUPER_ADMIN;
}

/**
 * Check if user can manage integrations
 */
export function canManageIntegrations(role?: string | null): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_PARTNER;
}

/**
 * Check if user can access inbox
 */
export function canAccessInbox(role?: string | null): boolean {
  return role === UserRole.AGENT || role === UserRole.SUPER_ADMIN;
}

/**
 * Check if user can manage flows
 */
export function canManageFlows(role?: string | null): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_PARTNER;
}

/**
 * Check if user can view analytics
 */
export function canViewAnalytics(role?: string | null): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_PARTNER;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role?: string | null): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'Super Admin';
    case UserRole.AGENT:
      return 'Agent';
    case UserRole.BUSINESS_PARTNER:
      return 'Business Partner';
    default:
      return 'Unknown';
  }
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role?: string | null): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case UserRole.AGENT:
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case UserRole.BUSINESS_PARTNER:
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(
  userRole?: string | null,
  allowedRoles?: Role[]
): boolean {
  if (!userRole || !allowedRoles) return false;
  return allowedRoles.includes(userRole as Role);
}

/**
 * Get default redirect path based on role
 */
export function getDefaultRedirectPath(role?: string | null): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return '/dashboard';
    case UserRole.AGENT:
      return '/inbox';
    case UserRole.BUSINESS_PARTNER:
      return '/dashboard';
    default:
      return '/inbox';
  }
}
