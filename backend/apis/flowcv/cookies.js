/**
 * Build a single Cookie header value from axios `set-cookie` response headers.
 */
export function cookieHeaderFromSetCookie(setCookie) {
  if (!setCookie) return '';
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  return list
    .map((c) => String(c).split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}
