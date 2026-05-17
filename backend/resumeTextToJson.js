/**
 * Parses plain-text tailored resume (OpenAI output) into structured JSON.
 */

const findLineIndex = (lines, regex, from = 0) => {
  for (let i = from; i < lines.length; i++) {
    if (regex.test(lines[i].trim())) return i;
  }
  return -1;
};

const sliceSection = (lines, startIdx, endIdx) => {
  if (startIdx < 0) return [];
  const end = endIdx < 0 ? lines.length : endIdx;
  return lines.slice(startIdx, end).map((l) => l.trimEnd());
};

const parseImpactLines = (sectionLines) => {
  const impact = {};
  let flag = true;
  let key = "";
  let value = "";
  for (const raw of sectionLines) {
    const line = raw.trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) {
      if (flag) key = line.trim();
      else {
        impact[key] = line.trim();
      }
      flag = !flag;
    } else {
      key = line.slice(0, colon).trim();
      value = line.slice(colon + 1).trim();
      if (!key) continue;
      impact[key] = value;
    }
  }
  return impact;
};

const stripOuterBold = (line) => {
  let s = line.trim();
  while (s.startsWith("@@")) s = s.slice(2).trim();
  while (s.endsWith("@@")) s = s.slice(0, -2).trim();
  return s;
};

/** Split on commas that are not inside parentheses. */
const splitCommaList = (rest) => {
  const parts = [];
  let cur = "";
  let depth = 0;
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.filter(Boolean);
};

const parseCoreTechnologiesLines = (sectionLines) => {
  const core = {};
  for (const raw of sectionLines) {
    let line = stripOuterBold(raw);
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) {
      core["_uncategorized"] = core["_uncategorized"] || [];
      core["_uncategorized"].push(line);
      continue;
    }
    const category = line.slice(0, colon).replace(/\*\*/g, "").trim();
    const rest = line.slice(colon + 1).trim();
    if (!category) continue;
    core[category] = splitCommaList(rest);
  }
  return core;
};

const isBulletLine = (line) => /^\s*[•\-\*]/.test(line);

const stripBulletPrefix = (line) =>
  String(line || "")
    .trim()
    .replace(/^\s*[•\-\*]\s*/, "")
    .trim();

const parseWorkExperience = (sectionLines) => {
  const jobs = [];
  let current = [];
  let flag = false;
  for (const raw of sectionLines) {
    if (raw == "") {
      if (!flag) {
        if (current.length > 0) {
          jobs.push(current);
        }
        current = [];
      }
      flag = !flag;
    }

    if (flag) continue;

    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (isBulletLine(trimmed)) trimmed = stripBulletPrefix(trimmed);
    if (!trimmed) continue;

    current.push(line);
  }

  if (current.length > 0) jobs.push(current);

  return jobs.map((j) => ({
    heading: "heading",
    bulletsText: j.join("\n"),
  }));
};

const extractResumeFileName = (text) => {
  const m = text.match(/Resume\s+file\s+name:\s*\*?\*?([^\r\n*]+)\*?\*?/i);
  return m ? m[1] : "";
};

const stripResumeFileLine = (educationBlock) =>
  educationBlock.replace(/\s*Resume\s+file\s+name:\s*[^\r\n]+/i, "");

/**
 * @param {string} text - full tailored resume text from the model
 * @returns {object}
 */
export function parseTailoredResumeTextToJson(text) {
  const full = String(text || "");
  const lines = full.split(/\r?\n/);

  const summaryIdx = findLineIndex(lines, /^(summary|profile)(\s+|$)/i);
  const impactIdx = findLineIndex(lines, /^(impact|selected impact)(\s+|$)/i);
  const techIdx = findLineIndex(
    lines,
    /^(core technologies|core skills|skills)$/i,
  );
  const workIdx = findLineIndex(
    lines,
    /^(work experience|professional experience)(\s+|$)/i,
  );
  const eduIdx = findLineIndex(lines, /^education$/i);

  const preface = summaryIdx > 0 ? sliceSection(lines, 0, summaryIdx) : [];
  const prefaceNonEmpty = preface
    .map((l) => l.trim().replaceAll("@@", "").replaceAll("**", ""))
    .filter(Boolean);

  let summaryText = "";
  if (summaryIdx >= 0) {
    const first = lines[summaryIdx].trim();
    const m = first.match(/^summary\s*(.*)$/i);
    const firstLineRest = m && m[1] ? m[1].trim() : "";
    const end =
      impactIdx >= 0
        ? impactIdx
        : techIdx >= 0
          ? techIdx
          : workIdx >= 0
            ? workIdx
            : lines.length;
    const summaryLines = sliceSection(lines, summaryIdx + 1, end);
    summaryText = [firstLineRest, ...summaryLines].join("\n").trim();
  }

  const nextAfterImpact =
    techIdx >= 0
      ? techIdx
      : workIdx >= 0
        ? workIdx
        : eduIdx >= 0
          ? eduIdx
          : lines.length;
  const impactLines =
    impactIdx >= 0 ? sliceSection(lines, impactIdx + 1, nextAfterImpact) : [];
  const nextAfterTech =
    workIdx >= 0 ? workIdx : eduIdx >= 0 ? eduIdx : lines.length;
  const techLines =
    techIdx >= 0 ? sliceSection(lines, techIdx + 1, nextAfterTech) : [];

  const nextAfterWork = eduIdx >= 0 ? eduIdx : lines.length;
  const workLines =
    workIdx >= 0 ? sliceSection(lines, workIdx + 1, nextAfterWork) : [];

  let educationText = "";
  if (eduIdx >= 0) {
    educationText = sliceSection(lines, eduIdx + 1, lines.length)
      .join("\n")
      .trim();
    educationText = stripResumeFileLine(educationText);
  }

  const fullName = prefaceNonEmpty[0] || "";
  const title = prefaceNonEmpty[1] || "";
  const contactLine = prefaceNonEmpty[2] || "";
  const additionalLinks = prefaceNonEmpty.slice(3);

  const workParsed = parseWorkExperience(workLines);
  /** Heading + bullets in one string per role. */
  const workExperienceStrings = workParsed.map((j) =>
    [j.heading, j.bulletsText].filter(Boolean).join("\n"),
  );
  /** Only bullet blocks (matches a flat array of multi-line bullet strings). */
  const workExperienceBulletsOnly = workParsed
    .map((j) => stripBulletPrefix(j.bulletsText))
    .filter(Boolean);

  return {
    fullName,
    title,
    contactLine,
    additionalLinks,
    summary: summaryText,
    impact: parseImpactLines(impactLines),
    coreTechnologies: parseCoreTechnologiesLines(techLines),
    workExperience: workParsed,
    /** One string per role: heading then bullet lines. */
    workExperienceAsStrings: workExperienceStrings,
    /** Array of bullet-only blocks (no job heading line), newline-separated bullets. */
    workExperienceBulletsOnly,
    education: educationText,
    resumeFileName: extractResumeFileName(full),
  };
}
