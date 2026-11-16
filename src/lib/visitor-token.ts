import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

/**
 * Visitor tokens for the public widget API.
 *
 * `tenantId` is public (it is embedded in every website that hosts the widget)
 * and `contactId` may be predictable (an app user id, a timestamp...). So the
 * pair alone must never unlock a visitor's chat history. The server hands out
 * an HMAC over (tenantId, contactId); clients send it back as `visitorToken`
 * to prove they are the visitor the server issued that contactId to.
 */

function secret(): string {
  const s = process.env.WIDGET_TOKEN_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error('WIDGET_TOKEN_SECRET (or AUTH_SECRET) must be set');
  return s;
}

export function signVisitorToken(tenantId: string, contactId: string): string {
  return createHmac('sha256', secret()).update(`v1:${tenantId}:${contactId}`).digest('base64url');
}

export function verifyVisitorToken(
  tenantId: string,
  contactId: string,
  token: string | null | undefined
): boolean {
  if (!token) return false;
  const expected = Buffer.from(signVisitorToken(tenantId, contactId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Unguessable contact id for anonymous visitors. */
export function newAnonymousContactId(): string {
  return `widget_${randomUUID()}`;
}

/**
 * Old SDK builds restore history with only tenantId + contactId. That path is
 * off by default; set WIDGET_LEGACY_CONTACT_LOOKUP=true only as a temporary
 * bridge while clients upgrade.
 */
export function legacyContactLookupEnabled(): boolean {
  return process.env.WIDGET_LEGACY_CONTACT_LOOKUP === 'true';
}
