import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { parseTailoredResumeTextToJson } from "./resumeTextToJson.js";
import { syncFlowCvPersonalDetailsAfterTailor } from "./apis/flowcv/syncPersonalDetails.js";
import {
  ensureFlowCvSession,
  getFlowCvActiveResumeId,
  getFlowCvCookie,
  getFlowCvSessionInfo,
  initializeFlowCvSession,
  loginFlowCvSession,
  logoutFlowCvSession,
  setFlowCvActiveResumeId,
  syncActiveResumeFromFlowCvApi,
} from "./apis/flowcv/session.js";
import { flowCvRequestContext } from "./apis/flowcv/flowCvRequestContext.js";
import {
  parseSignedFlowCvSessionFromCookieHeader,
  buildFlowCvSessionSetCookieValue,
  buildFlowCvSessionClearCookieValue,
  hasFlowCvBrowserCookieSupport,
} from "./apis/flowcv/flowCvBrowserCookie.js";
import { with401Retry } from "./apis/flowcv/flowCvWith401Retry.js";
import { downloadFlowCvResumePdf } from "./apis/flowcv/downloadResumePdf.js";
import { fetchFlowCvResumesAll } from "./apis/flowcv/fetchResumesAll.js";

dotenv.config();

/** Query values may be `string[]` behind some proxies (e.g. Vercel). */
function firstQueryParam(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return String(v[0] ?? "").trim();
  return String(v).trim();
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  const parsed = parseSignedFlowCvSessionFromCookieHeader(
    req.headers.cookie || "",
  );
  flowCvRequestContext.run(parsed, () => next());
});

// OpenAI API endpoint
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const isBlank = (v) => !String(v ?? "").trim();
const hasNonEmptyStringArray = (arr) =>
  Array.isArray(arr) && arr.some((x) => !isBlank(x));
const hasNonEmptyObject = (obj) =>
  obj &&
  typeof obj === "object" &&
  !Array.isArray(obj) &&
  Object.keys(obj).length > 0;

const validateTailoredResumeJson = (json) => {
  const j = json && typeof json === "object" ? json : {};

  if (isBlank(j.fullName)) return { ok: false, missing: "fullName" };
  if (isBlank(j.title)) return { ok: false, missing: "title" };
  if (isBlank(j.summary)) return { ok: false, missing: "summary" };
  if (!hasNonEmptyObject(j.coreTechnologies))
    return { ok: false, missing: "coreTechnologies" };
  if (!hasNonEmptyStringArray(j.workExperienceBulletsOnly))
    return { ok: false, missing: "workExperienceBulletsOnly" };
  if (isBlank(j.resumeFileName))
    return { ok: false, missing: "resumeFileName" };

  return { ok: true, missing: null };
};

// Sync resume directly to FlowCV (skip OpenAI)
app.post("/api/sync-resume", async (req, res) => {
  try {
    const { currentResume, resumeFileName } = req.body;

    if (!currentResume) {
      return res
        .status(400)
        .json({ error: "Current resume is required" });
    }

    // Parse resume text to JSON
    const tailoredResumeJson = parseTailoredResumeTextToJson(currentResume);

    // Validate parsed JSON
    const v = validateTailoredResumeJson(tailoredResumeJson);
    if (!v.ok) {
      return res.status(400).json({
        error: "Failed to parse resume text",
        details: `Missing or empty field: ${v.missing}`,
        parsed: tailoredResumeJson,
      });
    }

    // Use provided filename or generate one
    if (resumeFileName) {
      tailoredResumeJson.resumeFileName = resumeFileName;
    }

    // Sync to FlowCV and get PDF
    const flowCvSync = await syncFlowCvPersonalDetailsAfterTailor(tailoredResumeJson);

    if (!flowCvSync.ok) {
      return res.status(500).json({
        error: "Failed to sync resume to FlowCV",
        details: flowCvSync.error,
      });
    }

    res.json({
      tailoredResume: currentResume,
      tailoredResumeJson,
      flowCvSync,
    });
  } catch (error) {
    console.error("Error syncing resume to FlowCV:", error.message || error);
    res.status(500).json({
      error: "Failed to sync resume to FlowCV",
      details: error.message || String(error),
    });
  }
});

// Generate tailored resume using OpenAI API
app.post("/api/tailor-resume", async (req, res) => {
  try {
    const { currentResume, jobDescription, apiKey } = req.body;

    const maxAttempts = 3;
    let tailoredResume = "";
    let tailoredResumeJson = null;

    tailoredResumeJson = parseTailoredResumeTextToJson(currentResume);

    const v = validateTailoredResumeJson(tailoredResumeJson);

    const flowCvSync =
      await syncFlowCvPersonalDetailsAfterTailor(tailoredResumeJson);

    res.json({ tailoredResume: "", tailoredResumeJson, flowCvSync });
  } catch (error) {
    console.error(
      "Error calling OpenAI API:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      error: "Failed to generate tailored resume",
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

/**
 * Proxy FlowCV resume download (browser-safe).
 * Uses server-side FlowCV session cookie and streams PDF bytes.
 */
app.get("/api/flowcv/download-pdf", async (req, res) => {
  try {
    await ensureFlowCvSession();
    const cookie = getFlowCvCookie();
    if (!cookie) {
      return res
        .status(401)
        .json({ error: "FlowCV session is not initialized" });
    }

    const resumeId = String(
      firstQueryParam(req.query?.resumeId) ||
        getFlowCvActiveResumeId() ||
        "",
    ).trim();
    const previewPageCountRaw =
      firstQueryParam(req.query?.previewPageCount) || "2";
    const previewPageCount = Number(previewPageCountRaw);

    if (!resumeId) {
      return res.status(400).json({ error: "resumeId is required" });
    }

    const pdf = await with401Retry(async (c) => {
      return await downloadFlowCvResumePdf({
        resumeId,
        previewPageCount: Number.isFinite(previewPageCount)
          ? previewPageCount
          : 2,
        cookie: c,
      });
    });

    const filename =
      firstQueryParam(req.query?.filename) || "flowcv-resume.pdf";
    res.setHeader("Content-Type", pdf.contentType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename.replace(/"/g, "")}"`,
    );
    res.status(200);
    return res.end(pdf.buffer);
  } catch (error) {
    console.error("[FlowCV] download-pdf error:", error?.message || error);
    const upstream = Number(error?.statusCode);
    const status =
      upstream >= 400 && upstream < 600 ? upstream : 500;
    return res.status(status).json({
      error: "Failed to download FlowCV PDF",
      details: error?.message || String(error),
    });
  }
});

/**
 * Proxy FlowCV GET resumes/all (session cookie).
 * - No query: same JSON as app.flowcv.com (full list under body.data.resumes).
 * - ?resumeIndex=n (0-based, same as body.data.resumes[n]): one resume only, smaller payload.
 */
app.get("/api/flowcv/resumes/all", async (req, res) => {
  try {
    await ensureFlowCvSession();
    const cookie = getFlowCvCookie();
    if (!cookie) {
      return res
        .status(401)
        .json({ error: "FlowCV session is not initialized" });
    }

    const data = await with401Retry(async (c) => {
      return await fetchFlowCvResumesAll({ cookie: c });
    });

    const rawIdx = req.query.resumeIndex ?? req.query.index;
    if (rawIdx !== undefined && String(rawIdx).trim() !== "") {
      const idx = Number(rawIdx);
      if (!Number.isFinite(idx) || !Number.isInteger(idx) || idx < 0) {
        return res.status(400).json({
          error: "Invalid resumeIndex",
          details:
            "Use a non-negative integer index into data.resumes (0 = first resume, 1 = second, …).",
        });
      }
      const resumes = data?.data?.resumes;
      if (!Array.isArray(resumes)) {
        return res.status(502).json({
          error: "Unexpected FlowCV response",
          details: "Missing data.resumes array on upstream payload.",
        });
      }
      if (idx >= resumes.length) {
        return res.status(404).json({
          error: "resumeIndex out of range",
          resumeIndex: idx,
          count: resumes.length,
        });
      }
      return res.status(200).json({
        success: true,
        code: 200,
        resumeIndex: idx,
        count: resumes.length,
        resume: resumes[idx],
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("[FlowCV] resumes/all error:", error?.message || error);
    const status = error?.statusCode >= 400 ? error.statusCode : 500;
    return res.status(status).json({
      error: "Failed to fetch FlowCV resumes",
      details: error?.message || String(error),
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/** FlowCV: report whether a server-side session cookie exists (no secrets). */
app.get("/api/flowcv/session", (req, res) => {
  try {
    const info = getFlowCvSessionInfo();
    res.json({
      connected: info.connected,
      email: info.email || undefined,
      resumeId: info.resumeId || undefined,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/** FlowCV: sign in with the same credentials as app.flowcv.com (stores session server-side). */
app.post("/api/flowcv/login", async (req, res) => {
  try {
    const email = req.body?.email;
    const password = req.body?.password;
    const loginOutcome = await loginFlowCvSession(email, password);
    if (!loginOutcome.ok) {
      return res.status(401).json({
        ok: false,
        error: "FlowCV login failed",
        details: "Invalid email or password",
      });
    }

    let resumeId = "";
    await flowCvRequestContext.run(
      { sessionCookie: loginOutcome.cookie, email: loginOutcome.email },
      async () => {
        await syncActiveResumeFromFlowCvApi();
        resumeId = getFlowCvActiveResumeId();
      },
    );

    const browserCookie = buildFlowCvSessionSetCookieValue(
      loginOutcome.cookie,
      resumeId,
      loginOutcome.email || "",
    );
    if (browserCookie) {
      res.append("Set-Cookie", browserCookie);
    } else if (!hasFlowCvBrowserCookieSupport()) {
      console.warn(
        "[FlowCV] FLOWCV_SESSION_SECRET is not set; deploy one on Vercel so PDF download works across serverless instances.",
      );
    }
    res.json({
      ok: true,
      email: loginOutcome.email,
      resumeId: resumeId || undefined,
    });
  } catch (error) {
    console.error("[FlowCV] login error:", error?.message || error);
    res.status(401).json({
      error: "FlowCV login failed",
      details: error?.message || String(error),
    });
  }
});

app.post("/api/flowcv/logout", (req, res) => {
  try {
    logoutFlowCvSession();
    const clr = buildFlowCvSessionClearCookieValue();
    if (clr) res.append("Set-Cookie", clr);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/**
 * Set which FlowCV resume id save/download/sync use (must exist under resumes/all).
 * Body: { "resumeId": "uuid" } or { "resumeIndex": 0 } (0-based).
 */
app.post("/api/flowcv/active-resume", async (req, res) => {
  try {
    await ensureFlowCvSession();
    if (!getFlowCvCookie()) {
      return res
        .status(401)
        .json({ error: "FlowCV session is not initialized" });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const directId = String(body.resumeId ?? "").trim();
    if (directId) {
      setFlowCvActiveResumeId(directId);
      await syncActiveResumeFromFlowCvApi();
      const sc = buildFlowCvSessionSetCookieValue(
        getFlowCvCookie(),
        getFlowCvActiveResumeId(),
        getFlowCvSessionInfo().email || "",
      );
      if (sc) res.append("Set-Cookie", sc);
      return res.json({ ok: true, resumeId: getFlowCvActiveResumeId() });
    }

    const rawIdx = body.resumeIndex;
    if (rawIdx === undefined || rawIdx === null || String(rawIdx).trim() === "") {
      return res.status(400).json({
        error: "Provide resumeId or resumeIndex",
      });
    }

    const idx = Number(rawIdx);
    if (!Number.isFinite(idx) || !Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ error: "Invalid resumeIndex" });
    }

    const data = await with401Retry(async (c) => {
      return await fetchFlowCvResumesAll({ cookie: c });
    });
    const resumes = data?.data?.resumes;
    if (!Array.isArray(resumes) || idx >= resumes.length) {
      return res.status(404).json({
        error: "resumeIndex out of range",
        resumeIndex: idx,
        count: Array.isArray(resumes) ? resumes.length : 0,
      });
    }
    const picked = String(resumes[idx]?.id || "").trim();
    if (!picked) {
      return res.status(404).json({ error: "Resume at index has no id" });
    }
    setFlowCvActiveResumeId(picked);
    await syncActiveResumeFromFlowCvApi();
    const sc2 = buildFlowCvSessionSetCookieValue(
      getFlowCvCookie(),
      getFlowCvActiveResumeId(),
      getFlowCvSessionInfo().email || "",
    );
    if (sc2) res.append("Set-Cookie", sc2);
    return res.json({
      ok: true,
      resumeId: getFlowCvActiveResumeId(),
      resumeIndex: idx,
    });
  } catch (error) {
    console.error("[FlowCV] active-resume error:", error?.message || error);
    return res.status(500).json({
      error: "Failed to set active resume",
      details: error?.message || String(error),
    });
  }
});

/** Vercel runs this file as a serverless handler — no `listen()` (see `api/index.mjs`). */
export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeFlowCvSession()
      .then((r) => {
        if (r.ok) {
          console.log(`[FlowCV] Session ready (${r.source})`);
        } else {
          console.log(
            "[FlowCV] No session yet — use the app FlowCV sign-in, or start the server after a saved session exists on disk.",
          );
        }
      })
      .catch((err) =>
        console.error(
          "[FlowCV] Session init failed (will retry on first sync):",
          err.message,
        ),
      );
  });
}
