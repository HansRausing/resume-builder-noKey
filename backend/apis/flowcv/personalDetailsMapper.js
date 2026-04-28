/**
 * FlowCV `personalDetails` for save_personal_details.
 * Base shape comes from the active resume's `personalDetails` (GET resumes/all),
 * stored in the server session. Only `jobTitle` is overridden from `tailoredResumeJson.title`
 * (markdown ** stripped).
 */

import { getFlowCvPersonalDetailsTemplate } from './session.js';

export function stripBoldMarkers(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .trim();
}

/** Minimal shape if resumes/all snapshot is not available yet. */
function emptyPersonalDetailsShape() {
  return {
    phone: '',
    photo: {},
    social: {
      linkedIn: {
        link: '',
        display: '',
      },
    },
    address: '',
    fullName: '',
    jobTitle: '',
    usAddress: false,
    detailsOrder: ['displayEmail', 'phone', 'address', 'linkedIn'],
    displayEmail: '',
    showPlaceholder: false,
  };
}

/**
 * @param {Record<string, unknown>} tailoredResumeJson
 */
export function tailoredResumeJsonToFlowCvPersonalDetails(tailoredResumeJson) {
  const json = tailoredResumeJson && typeof tailoredResumeJson === 'object' ? tailoredResumeJson : {};
  const title = /** @type {string} */ (json.title || '');

  const base = getFlowCvPersonalDetailsTemplate() || emptyPersonalDetailsShape();
  const out = JSON.parse(JSON.stringify(base));

  out.jobTitle = stripBoldMarkers(title);

  if (!out.social) out.social = {};
  if (!out.social.linkedIn) {
    out.social.linkedIn = { link: '', display: '' };
  } else {
    out.social.linkedIn = { ...out.social.linkedIn };
  }

  if (!Array.isArray(out.detailsOrder)) {
    out.detailsOrder = ['displayEmail', 'phone', 'address', 'linkedIn'];
  } else {
    out.detailsOrder = [...out.detailsOrder];
  }

  return out;
}
