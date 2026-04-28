import axios from 'axios';
import { FLOWCV_API_BASE } from './config.js';
import { FlowCvPaths } from './endpoints.js';

/**
 * GET /resumes/all — list all resumes for the logged-in FlowCV account.
 *
 * @param {{ cookie: string }} params
 * @returns {Promise<unknown>} Parsed JSON body (e.g. { success, data: { resumes }, error, code })
 */
export async function fetchFlowCvResumesAll({ cookie }) {
  const base = FLOWCV_API_BASE.replace(/\/$/, '');
  const url = `${base}/${FlowCvPaths.resumesAll}`;

  const res = await axios.get(url, {
    headers: {
      Accept: 'application/json',
      Cookie: cookie,
    },
    validateStatus: () => true,
  });

  if (res.status === 401) {
    const err = new Error('FlowCV session unauthorized');
    err.statusCode = 401;
    throw err;
  }

  if (res.status >= 400) {
    const body = res.data;
    const msg =
      (typeof body === 'object' && body !== null && (body.message || body.error)) ||
      (typeof body === 'string' ? body : null) ||
      `FlowCV resumes/all failed (HTTP ${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    throw err;
  }

  return res.data;
}
