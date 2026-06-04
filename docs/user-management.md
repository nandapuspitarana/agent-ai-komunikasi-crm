# User Management & Audit Logging Documentation

## Overview

Sistem User Management lengkap dengan audit logging, change password, dan reset password untuk ZetaCRM.

## Features

### 1. User Management (CRUD)
- ✅ List all users with search and filter
- ✅ Create new user
- ✅ View user details with activity history
- ✅ Update user information
- ✅ Delete user
- ✅ Role-based access control

### 2. Audit Logging
- ✅ Automatic logging of all user activities
- ✅ Track CRUD operations
- ✅ Login/logout tracking
- ✅ Password change tracking
- ✅ Role and status changes
- ✅ IP address and user agent logging
- ✅ Change history (old vs new values)

### 3. Password Management
- ✅ Change password (authenticated users)
- ✅ Forgot password flow
- ✅ Reset password with token
- ✅ Password strength requirements
- ✅ Token expiration (1 hour)
- ✅ Prevent token reuse

## API Endpoints

### User Management

#### GET /api/users
Get all users (Super Admin only)
```
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- search: string (search by name or email)
- role: string (filter by role)

Response:
{
  "users": [...],
  "total": number,
  "page": number,
  "totalPages": number
}
```

#### POST /api/users
Create new user (Super Admin only)
```
Request Body:
{
  "email": string,
  "password": string,
  "name": string,
  "role": "SUPER_ADMIN" | "AGENT" | "BUSINESS_PARTNER",
  "tenantId": string (optional),
  "isActive": boolean (optional)
}

Response:
{
  "user": {...}
}
```

#### GET /api/users/[id]
Get user details with audit logs
```
Response:
{
  "user": {...},
  "auditLogs": [...]
}
```

#### PUT /api/users/[id]
Update user information
```
Request Body:
{
  "name": string (optional),
  "email": string (optional),
  "role": string (optional, Super Admin only),
  "tenantId": string (optional, Super Admin only),
  "isActive": boolean (optional, Super Admin only)
}

Response:
{
  "user": {...}
}
```

#### DELETE /api/users/[id]
Delete user (Super Admin only)
```
Response:
{
  "success": true
}
```

### Password Management

#### POST /api/users/[id]/change-password
Change password (authenticated users)
```
Request Body:
{
  "currentPassword": string,
  "newPassword": string,
  "confirmPassword": string
}

Response:
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### POST /api/auth/forgot-password
Request password reset
```
Request Body:
{
  "email": string
}

Response:
{
  "success": true,
  "message": "If the email exists, a reset link will be sent",
  "token": string (development only)
}
```

#### POST /api/auth/reset-password
Reset password with token
```
Request Body:
{
  "token": string,
  "newPassword": string,
  "confirmPassword": string
}

Response:
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

### Audit Logs

#### GET /api/audit-logs
Get all audit logs (Super Admin only)
```
Query Parameters:
- page: number (default: 1)
- limit: number (default: 50)

Response:
{
  "logs": [...],
  "total": number,
  "page": number,
  "totalPages": number
}
```

## Audit Actions

The system tracks the following actions:

- `USER_CREATED` - New user created
- `USER_UPDATED` - User information updated
- `USER_DELETED` - User deleted
- `USER_LOGIN` - User logged in
- `USER_LOGOUT` - User logged out
- `PASSWORD_CHANGED` - Password changed by user
- `PASSWORD_RESET_REQUESTED` - Password reset requested
- `PASSWORD_RESET_COMPLETED` - Password reset completed
- `ROLE_CHANGED` - User role changed
- `STATUS_CHANGED` - User status changed (active/inactive)

## Pages

### User Management
- `/settings/users` - List all users
- `/settings/users/[id]` - View user details and activity log
- `/settings/users/[id]/edit` - Edit user (to be implemented)
- `/settings/users/new` - Create new user (to be implemented)

### Password Management
- `/settings/change-password` - Change own password
- `/forgot-password` - Request password reset
- `/reset-password?token=xxx` - Reset password with token

### Audit Logs
- `/settings/audit-logs` - View all audit logs (Super Admin only)

### Settings
- `/settings` - Settings dashboard with links to all features

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Password Reset Token
- Cryptographically secure random token
- Expires after 1 hour
- Single-use only
- Automatically invalidated after use

### Access Control
- Super Admin: Full access to all features
- Agent: Can only change own password
- Business Partner: Can only change own password

### Audit Trail
- All user actions are logged
- IP address and user agent tracking
- Change history (before/after values)
- Cannot be deleted or modified

## Usage Examples

### Change Password
```typescript
const response = await fetch(`/api/users/${userId}/change-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    currentPassword: 'old123',
    newPassword: 'New123456',
    confirmPassword: 'New123456',
  }),
});
```

### Request Password Reset
```typescript
const response = await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
  }),
});
```

### Create User
```typescript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'Password123',
    name: 'New User',
    role: 'AGENT',
    tenantId: 'tenant-id',
    isActive: true,
  }),
});
```

### View Audit Logs
```typescript
const response = await fetch('/api/audit-logs?page=1&limit=50');
const data = await response.json();
console.log(data.logs);
```

## Database Schema

### User Model (Updated)
```prisma
model User {
  id                String              @id @default(uuid())
  email             String              @unique
  password          String
  name              String
  role              UserRole            @default(AGENT)
  tenantId          String?
  tenant            Tenant?             @relation(fields: [tenantId], references: [id])
  isActive          Boolean             @default(true)
  lastLoginAt       DateTime?           // NEW
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  auditLogs         AuditLog[]          @relation("AuditLogUser")
  performedAudits   AuditLog[]          @relation("AuditLogPerformedBy")
  passwordResetTokens PasswordResetToken[]
}
```

### AuditLog Model (New)
```prisma
model AuditLog {
  id            String      @id @default(uuid())
  action        AuditAction
  userId        String?
  user          User?       @relation("AuditLogUser", fields: [userId], references: [id])
  performedById String?
  performedBy   User?       @relation("AuditLogPerformedBy", fields: [performedById], references: [id])
  entityType    String
  entityId      String?
  changes       Json?
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime    @default(now())
}
```

### PasswordResetToken Model (New)
```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  usedAt    DateTime?
  createdAt DateTime @default(now())
}
```

## Testing

### Test User Management
1. Login as Super Admin (admin@zetacrm.com)
2. Navigate to Settings > User Management
3. View list of users
4. Click on a user to view details and activity log
5. Test create, update, delete operations

### Test Change Password
1. Login with any user account
2. Navigate to Settings > Change Password
3. Enter current password and new password
4. Verify password is changed successfully

### Test Password Reset
1. Go to login page
2. Click "Forgot Password"
3. Enter email address
4. Copy token from response (development mode)
5. Navigate to reset password page with token
6. Enter new password and confirm

### Test Audit Logs
1. Login as Super Admin
2. Navigate to Settings > Audit Logs
3. Verify all activities are logged
4. Check user details page for user-specific logs

## Next Steps

To complete the user management system:

1. **Email Integration**: Send actual password reset emails
2. **User Creation Form**: Create UI for adding new users
3. **User Edit Form**: Create UI for editing users
4. **Export Audit Logs**: Add CSV/PDF export functionality
5. **Advanced Filtering**: Add more filter options for users and logs
6. **Bulk Operations**: Add bulk user activation/deactivation
7. **Session Management**: Track and manage active sessions
8. **2FA/MFA**: Add two-factor authentication

## Support

For issues or questions, please refer to the main README.md or contact the development team.
