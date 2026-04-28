import { createHmac, timingSafeEqual } from 'node:crypto';

/** HttpOnly cookie carrying the FlowCV session token, signed when a secret is configured. */
export const FLOWCV_BROWSER_COOKIE_NAME = 'rb_flowcv';

function getSecret() {
  const s = process.env.FLOWCV_SESSION_SECRET;
  if (s && String(s).trim()) return String(s).trim();
  if (process.env.VERCEL) return null;
  return 'dev-insecure-flowcv-cookie';
}

export function hasFlowCvBrowserCookieSupport() {
  return true;
}

function parseCookieValue(header, name) {
  if (!header || typeof header !== 'string') return null;
  const parts = header.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (k === name) {
      try {
        return decodeURIComponent(v);
      } catch {
        return v;
      }
    }
  }
  return null;
}

/**
 * @param {string} cookieHeader raw Cookie header
 * @returns {{ sessionCookie: string, resumeId: string, email: string } | null}
 */
export function parseSignedFlowCvSessionFromCookieHeader(cookieHeader) {
  const secret = getSecret();
  const raw = parseCookieValue(cookieHeader, FLOWCV_BROWSER_COOKIE_NAME);
  if (!raw) return null;

  if (!secret) {
    return {
      sessionCookie: raw,
      resumeId: '',
      email: '',
    };
  }

  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  try {
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = Buffer.from(body, 'base64url').toString('utf8');
    const payload = JSON.parse(json);
    if (payload.v !== 1 || typeof payload.c !== 'string' || !payload.c.trim()) {
      return null;
    }
    return {
      sessionCookie: payload.c.trim(),
      resumeId: String(payload.rid || '').trim(),
      email: String(payload.e || '').trim(),
    };
  } catch {
    return null;
  }
}

/**
 * @returns {string | null} full Set-Cookie header value (append with res.append('Set-Cookie', …))
 */
export function buildFlowCvSessionSetCookieValue(sessionCookie, resumeId, email) {
  if (!sessionCookie) return null;
  const secret = getSecret();
  const secure = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';

  let cookieValue = encodeURIComponent(sessionCookie);
  if (secret) {
    const payload = {
      v: 1,
      c: sessionCookie,
      rid: String(resumeId || '').trim(),
      e: String(email || '').trim(),
      iat: Date.now(),
    };
    const json = JSON.stringify(payload);
    const body = Buffer.from(json, 'utf8').toString('base64url');
    const sig = createHmac('sha256', secret).update(body).digest('base64url');
    const token = `${body}.${sig}`;
    if (token.length > 3800) {
      console.warn(
        '[FlowCV] Signed session exceeds safe cookie size; set FLOWCV_SESSION_SECRET and retry, or shorten upstream session.',
      );
      return null;
    }
    cookieValue = encodeURIComponent(token);
  }

  const parts = [
    `${FLOWCV_BROWSER_COOKIE_NAME}=${cookieValue}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=2592000',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** @returns {string | null} */
export function buildFlowCvSessionClearCookieValue() {
  const secure = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
  const parts = [
    `${FLOWCV_BROWSER_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
