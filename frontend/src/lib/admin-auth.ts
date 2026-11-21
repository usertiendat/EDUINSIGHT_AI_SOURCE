/** Server-only admin token forwarding. Never expose tokens to client JS. */
import type { NextRequest } from 'next/server';
export const ADMIN_COOKIE = 'eduinsight_admin_session';
export const ADMIN_BACKEND = process.env.EDUINSIGHT_BACKEND_URL || process.env.FASTAPI_INTERNAL_URL || 'http://127.0.0.1:8000';
export function adminAuthorization(req: NextRequest | Request): string | null {
  if (!('cookies' in req)) return null;
  const token = (req as NextRequest).cookies.get(ADMIN_COOKIE)?.value;
  if (!token || token.length < 30 || token.length > 256) return null;
  return `Bearer ${token}`;
}
export function sameOrigin(req: NextRequest): boolean {
  const origin=req.headers.get('origin');
  if (!origin) return false;
  try { const url = new URL(origin);return url.origin===req.nextUrl.origin; } catch { return false; }
}
