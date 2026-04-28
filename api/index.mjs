/**
 * Vercel serverless entry: forwards all `/api/*` traffic to the Express app (see vercel.json rewrites).
 */
import app from "../backend/server.js";

export default app;
