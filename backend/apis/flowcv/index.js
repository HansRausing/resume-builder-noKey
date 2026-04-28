/**
 * Outbound FlowCV API integration (https://app.flowcv.com/api).
 */

export { FLOWCV_API_BASE, flowCvNowIso } from './config.js';
export { FlowCvPaths } from './endpoints.js';
export {
  getFlowCvActiveResumeId,
  getFlowCvCookie,
  getFlowCvPersonalDetailsTemplate,
  getFlowCvResumeContent,
  getFlowCvSessionInfo,
  loginFlowCvSession,
  logoutFlowCvSession,
  setFlowCvActiveResumeId,
  syncActiveResumeFromFlowCvApi,
  ensureFlowCvPersonalDetailsTemplate,
  initializeFlowCvSession,
  ensureFlowCvSession,
  refreshFlowCvSession,
} from './session.js';
export {
  FLOWCV_SESSION_FILE,
  readStoredSession,
  readStoredCookie,
  writeStoredCookie,
  clearStoredSession,
} from './sessionStore.js';
export { flowCvLogin } from './auth.js';
export {
  stripBoldMarkers,
  tailoredResumeJsonToFlowCvPersonalDetails,
} from './personalDetailsMapper.js';
export { saveFlowCvPersonalDetails } from './savePersonalDetails.js';
export {
  escapeFlowCvPlainText,
  descriptionToFlowCvHtml,
  summaryToFlowCvHtml,
  tailoredResumeJsonToFlowCvProfileSaveBody,
} from './profileEntryMapper.js';
export { tailoredResumeJsonToFlowCvImpactSaveBodies } from './impactEntryMapper.js';
export { tailoredResumeJsonToFlowCvSkillSaveBodies } from './skillEntryMapper.js';
export {
  bulletsTextToFlowCvUlHtml,
  tailoredResumeJsonToFlowCvWorkSaveBodies,
} from './workEntryMapper.js';
export { with401Retry } from './flowCvWith401Retry.js';
export { saveFlowCvEntry } from './saveEntry.js';
export { syncFlowCvPersonalDetailsAfterTailor } from './syncPersonalDetails.js';
export { downloadFlowCvResumePdf } from './downloadResumePdf.js';
export { fetchFlowCvResumesAll } from './fetchResumesAll.js';
