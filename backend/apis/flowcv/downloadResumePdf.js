import axios from 'axios';
import { FLOWCV_API_BASE } from './config.js';
import { FlowCvPaths } from './endpoints.js';

/**
 * Download resume PDF from FlowCV.
 *
 * FlowCV expects the session Cookie header; response is a PDF binary.
 *
 * @param {{ resumeId: string, previewPageCount?: number|string, cookie: string }} params
 */
export async function downloadFlowCvResumePdf({ resumeId, previewPageCount = 2, cookie }) {
  const base = FLOWCV_API_BASE.replace(/\/$/, '');
  const qpResumeId = encodeURIComponent(String(resumeId || '').trim());
  const qpPageCount = encodeURIComponent(String(previewPageCount ?? 2));
  const url = `${base}/${FlowCvPaths.downloadResume}?resumeId=${qpResumeId}&previewPageCount=${qpPageCount}`;

  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'application/pdf',
      Cookie: cookie,
    },
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    let msg =
      res.data?.message ||
      res.data?.error ||
      `FlowCV download failed (HTTP ${res.status})`;
    if (res.data && (ArrayBuffer.isView(res.data) || res.data instanceof ArrayBuffer)) {
      const buf = Buffer.from(res.data);
      const text = buf.toString('utf8', 0, Math.min(buf.length, 1200)).trim();
      if (text.startsWith('{')) {
        try {
          const j = JSON.parse(text);
          if (j.message || j.error) msg = String(j.message || j.error);
        } catch {
          /* keep msg */
        }
      } else if (text) {
        msg = text.slice(0, 500) || msg;
      }
    }
    const err = new Error(msg);
    err.statusCode = res.status;
    throw err;
  }

  const contentType = res.headers?.['content-type'] || 'application/pdf';
  const buf = Buffer.from(res.data);
  return { status: res.status, contentType, buffer: buf };
}

