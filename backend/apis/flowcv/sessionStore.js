import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Stored under `backend/` (not committed — see root `.gitignore`). */
export const FLOWCV_SESSION_FILE = join(__dirname, '..', '..', '.flowcv-session.json');

/**
 * @returns {{ cookie: string, email?: string, resumeId?: string, personalDetails?: object, resumeContent?: object } | null}
 */
export function readStoredSession() {
  try {
    if (!existsSync(FLOWCV_SESSION_FILE)) return null;
    const raw = readFileSync(FLOWCV_SESSION_FILE, 'utf8');
    const data = JSON.parse(raw);
    const cookie = data?.cookie;
    if (typeof cookie !== 'string' || !cookie.trim()) return null;
    const email =
      typeof data?.email === 'string' && data.email.trim()
        ? data.email.trim()
        : undefined;
    const resumeId =
      typeof data?.resumeId === 'string' && data.resumeId.trim()
        ? data.resumeId.trim()
        : undefined;
    const personalDetails =
      data?.personalDetails && typeof data.personalDetails === 'object'
        ? data.personalDetails
        : undefined;
    const resumeContent =
      data?.resumeContent && typeof data.resumeContent === 'object'
        ? data.resumeContent
        : undefined;
    return { cookie: cookie.trim(), email, resumeId, personalDetails, resumeContent };
  } catch {
    return null;
  }
}

/**
 * @returns {string | null}
 */
export function readStoredCookie() {
  return readStoredSession()?.cookie ?? null;
}

/**
 * @param {string} cookie
 * @param {string} [email] — display only (same email as FlowCV account)
 * @param {string} [resumeId] — FlowCV resume `id` from GET resumes/all
 * @param {object} [personalDetails] — snapshot from resume.personalDetails (resumes/all)
 * @param {object} [resumeContent] — snapshot from resume.content (resumes/all)
 */
export function writeStoredCookie(cookie, email, resumeId, personalDetails, resumeContent) {
  const payload = {
    cookie: String(cookie).trim(),
    savedAt: new Date().toISOString(),
  };
  if (email && String(email).trim()) payload.email = String(email).trim();
  if (resumeId && String(resumeId).trim()) payload.resumeId = String(resumeId).trim();
  if (personalDetails != null && typeof personalDetails === 'object') {
    payload.personalDetails = personalDetails;
  }
  if (resumeContent != null && typeof resumeContent === 'object') {
    payload.resumeContent = resumeContent;
  }
  try {
    writeFileSync(FLOWCV_SESSION_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // On serverless (e.g. Vercel), the filesystem may be read-only/ephemeral.
    // Safe to ignore — we'll re-login when needed.
  }
}

export function clearStoredSession() {
  try {
    if (existsSync(FLOWCV_SESSION_FILE)) unlinkSync(FLOWCV_SESSION_FILE);
  } catch {
    /* ignore */
  }
}
