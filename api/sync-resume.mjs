import { flowCvRequestContext } from "../backend/apis/flowcv/flowCvRequestContext.js";
import { parseSignedFlowCvSessionFromCookieHeader } from "../backend/apis/flowcv/flowCvBrowserCookie.js";
import { syncFlowCvPersonalDetailsAfterTailor } from "../backend/apis/flowcv/syncPersonalDetails.js";
import { parseTailoredResumeTextToJson } from "../backend/resumeTextToJson.js";

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

export default async function handler(req, res) {
  const parsed = parseSignedFlowCvSessionFromCookieHeader(
    req.headers?.cookie || "",
  );
  return flowCvRequestContext.run(parsed, async () => {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { currentResume, resumeFileName } = req.body || {};

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
}