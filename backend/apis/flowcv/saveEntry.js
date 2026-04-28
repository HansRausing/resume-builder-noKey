import axios from 'axios';
import { FLOWCV_API_BASE } from './config.js';
import { FlowCvPaths } from './endpoints.js';

/**
 * PATCH FlowCV resume section entry (e.g. profile summary).
 * @param {{ resumeId: string, sectionId: string, entry: object, cookie: string }} params
 */
export async function saveFlowCvEntry({ resumeId, sectionId, entry, cookie }) {
  const base = FLOWCV_API_BASE.replace(/\/$/, '');
  const url = `${base}/${FlowCvPaths.saveEntry}`;

  const res = await axios.patch(
    url,
    { resumeId, sectionId, entry },
    {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Cookie: cookie,
      },
      validateStatus: () => true,
    }
  );

  if (res.status >= 400) {
    const msg =
      res.data?.message ||
      res.data?.error ||
      (typeof res.data === 'string' ? res.data : null) ||
      `FlowCV save_entry failed (HTTP ${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    throw err;
  }

  return { status: res.status, data: res.data };
}
