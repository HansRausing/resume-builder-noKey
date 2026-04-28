import { flowCvLogin } from './auth.js';
import { fetchFlowCvResumesAll } from './fetchResumesAll.js';
import { flowCvRequestContext } from './flowCvRequestContext.js';

function clonePlain(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function resumeContentHasProfile(content) {
  return Boolean(
    content &&
      typeof content === 'object' &&
      Array.isArray(content.profile?.entries) &&
      content.profile.entries.length > 0,
  );
}

/**
 * FlowCV resume id for save/download/sync (session + persisted resumes/all).
 */
export function getFlowCvActiveResumeId() {
  const incoming = flowCvRequestContext.getStore();
  return String(incoming?.resumeId || '').trim();
}

/**
 * Deep clone of FlowCV `personalDetails` for the active resume (from resumes/all), or null.
 */
export function getFlowCvPersonalDetailsTemplate() {
  const incoming = flowCvRequestContext.getStore();
  if (incoming?.personalDetails && typeof incoming.personalDetails === 'object') {
    return clonePlain(incoming.personalDetails);
  }
  return null;
}

/**
 * Deep clone of `resume.content` from resumes/all for the active resume, or null.
 */
export function getFlowCvResumeContent() {
  const incoming = flowCvRequestContext.getStore();
  if (incoming?.resumeContent && typeof incoming.resumeContent === 'object') {
    return clonePlain(incoming.resumeContent);
  }
  return null;
}

/**
 * Set active resume id (must match a resume in the account).
 * Call {@link syncActiveResumeFromFlowCvApi} afterward to refresh snapshots from FlowCV.
 * @param {string} resumeId
 */
export function setFlowCvActiveResumeId(resumeId) {
  const id = String(resumeId || '').trim();
  if (!id) throw new Error('resumeId is required');
  const incoming = flowCvRequestContext.getStore();
  if (!incoming) {
    throw new Error('FlowCV request context is not available');
  }
  incoming.resumeId = id;
}

/**
 * Fetch resumes/all and sync active resume id + personalDetails + content from the matching resume.
 */
export async function syncActiveResumeFromFlowCvApi() {
  const incoming = flowCvRequestContext.getStore();
  if (!incoming) return;
  const cookie = getFlowCvCookie();
  if (!cookie) return;
  try {
    const body = await fetchFlowCvResumesAll({ cookie });
    const resumes = body?.data?.resumes;
    if (!Array.isArray(resumes) || resumes.length === 0) {
      console.warn('[FlowCV] resumes/all returned no resumes');
      return;
    }
    const wanted = String(incoming.resumeId || '').trim();
    let target = resumes[0];
    if (wanted) {
      const found = resumes.find((r) => String(r?.id || '').trim() === wanted);
      if (found) target = found;
    }
    const rid = String(target?.id || '').trim();
    if (!rid) return;
    incoming.resumeId = rid;
    const pd = target?.personalDetails;
    if (pd && typeof pd === 'object') {
      incoming.personalDetails = clonePlain(pd);
    }
    const content = target?.content;
    if (content && typeof content === 'object') {
      incoming.resumeContent = clonePlain(content);
    }
  } catch (err) {
    console.warn('[FlowCV] Could not sync resume snapshot from resumes/all:', err?.message || err);
  }
}

/**
 * Ensures personalDetails + resume.content exist (loads from disk or resumes/all).
 */
export async function ensureFlowCvPersonalDetailsTemplate() {
  if (getFlowCvPersonalDetailsTemplate() && resumeContentHasProfile(getFlowCvResumeContent())) {
    return;
  }
  await syncActiveResumeFromFlowCvApi();
}

/**
 * Current session cookie for FlowCV API calls (empty if not initialized).
 */
export function getFlowCvCookie() {
  const incoming = flowCvRequestContext.getStore();
  return incoming?.sessionCookie || '';
}

/**
 * @returns {{ connected: boolean, email: string, resumeId: string }}
 */
export function getFlowCvSessionInfo() {
  const incoming = flowCvRequestContext.getStore();
  if (incoming?.sessionCookie) {
    return {
      connected: true,
      email: String(incoming.email || '').trim(),
      resumeId: getFlowCvActiveResumeId(),
    };
  }
  return {
    connected: false,
    email: '',
    resumeId: '',
  };
}

/**
 * Sign in with FlowCV credentials (app.flowcv.com).
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ ok: true, cookie: string, email: string } | { ok: false }>}
 */
export async function loginFlowCvSession(email, password) {
  const e = String(email ?? '').trim();
  const p = String(password ?? '');
  if (!e || !p) {
    throw new Error('Email and password are required');
  }
  const loginResult = await flowCvLogin(e, p);
  if (loginResult === false) {
    return { ok: false };
  }
  return { ok: true, email: e, cookie: loginResult.cookie };
}

export function logoutFlowCvSession() {
  return { ok: true };
}

/**
 * Load cookie from disk if present. No shared server session is used.
 * @returns {Promise<{ ok: false, source: 'none' }>}
 */
export async function initializeFlowCvSession() {
  return { ok: false, source: 'none' };
}

/**
 * Drop server-side session after HTTP 401. Users must sign in again from the UI.
 */
export async function refreshFlowCvSession() {
  const err = new Error(
    'FlowCV session expired. Please sign in again with your FlowCV email and password.',
  );
  err.code = 'FLOWCV_SESSION_EXPIRED';
  throw err;
}

export function ensureFlowCvSession() {
  const incoming = flowCvRequestContext.getStore();
  if (incoming?.sessionCookie) {
    return Promise.resolve();
  }
  return Promise.reject(new Error('FlowCV session is not initialized'));
}
