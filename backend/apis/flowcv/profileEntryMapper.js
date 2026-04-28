import { flowCvNowIso } from "./config.js";
import { getFlowCvActiveResumeId, getFlowCvResumeContent } from "./session.js";

/**
 * Profile row shell from `resume.content.profile.entries[0]` (resumes/all).
 */
function getProfileEntryShell() {
  const content = getFlowCvResumeContent();
  const entry0 = content?.profile?.entries?.[0];
  if (!entry0 || typeof entry0 !== "object") {
    return {
      id: "",
      isHidden: false,
      createdAt: "",
      showPlaceholder: false,
    };
  }
  return {
    id: String(entry0.id || ""),
    isHidden: Boolean(entry0.isHidden),
    createdAt: String(entry0.createdAt || ""),
    showPlaceholder: Boolean(entry0.showPlaceholder),
  };
}

export function escapeFlowCvPlainText(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripBoldMarkers(text) {
  return String(text || "")
    .replace(/@@(.+?)@@/g, "<strong>$1</strong>")
    .replace(/^\@\@(.+)$/, "<strong>$1</strong>")
    .replace(/^(.+?)\@\@$/, "<strong>$1</strong>");
}

/** One paragraph: escape, @@bold@@, newlines → `<br>`, wrap in `<p>`. */
export function descriptionToFlowCvHtml(text) {
  const raw = String(text || "").trim();
  if (!raw) return "<p></p>";
  let s = stripBoldMarkers(escapeFlowCvPlainText(raw));
  return `<p>${s.replace(/\n/g, "<br>")}</p>`;
}

/**
 * Turn plain-text summary (with optional **bold**) into simple HTML for FlowCV.
 */
export function summaryToFlowCvHtml(summary) {
  const raw = String(summary || "").trim();
  if (!raw) return "<p></p>";

  let s = stripBoldMarkers(escapeFlowCvPlainText(raw));

  const blocks = s
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "<p></p>";

  return blocks
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Body for PATCH …/resumes/save_entry (profile section).
 * @param {Record<string, unknown>} tailoredResumeJson
 */
export function tailoredResumeJsonToFlowCvProfileSaveBody(tailoredResumeJson) {
  const json =
    tailoredResumeJson && typeof tailoredResumeJson === "object"
      ? tailoredResumeJson
      : {};
  const summary = /** @type {string} */ (json.summary || "");

  return {
    resumeId: getFlowCvActiveResumeId(),
    sectionId: "profile",
    entry: {
      ...getProfileEntryShell(),
      text: summaryToFlowCvHtml(summary),
      updatedAt: flowCvNowIso(),
    },
  };
}
