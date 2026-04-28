import { getFlowCvCookie, refreshFlowCvSession } from './session.js';

/**
 * Run a FlowCV call and retry once on 401 after clearing the stored session (user must sign in again).
 * Returns the function result.
 *
 * @template T
 * @param {(cookie: string) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function with401Retry(fn) {
  const cookie = getFlowCvCookie();
  try {
    return await fn(cookie);
  } catch (e) {
    if (e?.statusCode === 401) {
      await refreshFlowCvSession();
    }
    throw e;
  }
}
