import { flowCvNowIso } from "./config.js";
import { getFlowCvActiveResumeId, getFlowCvResumeContent } from "./session.js";
import { descriptionToFlowCvHtml } from "./profileEntryMapper.js";

/**
 * Impact row metas from `resume.content.custom1.entries` (id + createdAt per row).
 * @returns {{ id: string, createdAt: string }[]}
 */
function getImpactRowMetas() {
  const content = getFlowCvResumeContent();
  const entries = content?.custom1?.entries;
  if (!Array.isArray(entries)) return [];
  return entries
    .map((e) => ({
      id: String(e?.id || ""),
      createdAt: String(e?.createdAt || ""),
    }))
    .filter((m) => m.id);
}

const IMPACT_SHELL = {
  isHidden: false,
  location: "",
  subTitle: "",
  titleLink: "",
  endDateNew: "",
  startDateNew: "",
  showPlaceholder: false,
};

/**
 * Builds PATCH bodies for `sectionId: "custom1"` from `tailoredResumeJson.impact`.
 * Each object key → `entry.title`, value → `entry.description` (HTML).
 *
 * @param {Record<string, unknown>} tailoredResumeJson
 * @returns {Array<{ resumeId: string, sectionId: string, entry: object }>}
 */
export function tailoredResumeJsonToFlowCvImpactSaveBodies(tailoredResumeJson) {
  const json =
    tailoredResumeJson && typeof tailoredResumeJson === "object"
      ? tailoredResumeJson
      : {};
  const impact = json.impact;
  if (!impact || typeof impact !== "object") return [];

  const metas = getImpactRowMetas();
  const pairs = Object.entries(/** @type {Record<string, string>} */ (impact));
  const max = Math.min(pairs.length, metas.length);
  const bodies = [];

  for (let i = 0; i < max; i++) {
    const [title, descriptionText] = pairs[i];
    const meta = metas[i];
    bodies.push({
      resumeId: getFlowCvActiveResumeId(),
      sectionId: "custom1",
      entry: {
        id: meta.id,
        title: String(title || "")
          .replaceAll("@@", "")
          .trim(),
        ...IMPACT_SHELL,
        createdAt: meta.createdAt,
        updatedAt: flowCvNowIso(),
        description: descriptionToFlowCvHtml(String(descriptionText || "")),
      },
    });
  }

  return bodies;
}
