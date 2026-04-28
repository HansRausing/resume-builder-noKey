import axios from 'axios';
import { FLOWCV_API_BASE } from './config.js';
import { FlowCvPaths } from './endpoints.js';

/**
 * PATCH FlowCV resume personal details (requires session Cookie from login).
 * @param {{ resumeId: string, personalDetails: object, cookie: string }} params
 */
export async function saveFlowCvPersonalDetails({ resumeId, personalDetails, cookie }) {
  const base = FLOWCV_API_BASE.replace(/\/$/, '');
  const url = `${base}/${FlowCvPaths.savePersonalDetails}`;

  const res = await axios.patch(
    url,
    { resumeId, personalDetails },
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
      `FlowCV save_personal_details failed (HTTP ${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    throw err;
  }

  return { status: res.status, data: res.data };
}
