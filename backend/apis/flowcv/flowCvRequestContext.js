import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request FlowCV session parsed from the signed browser cookie (serverless-safe).
 * @typedef {{ sessionCookie: string, resumeId: string, email: string } | null} FlowCvRequestSession
 */
export const flowCvRequestContext = new AsyncLocalStorage();
