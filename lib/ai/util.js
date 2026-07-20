export function parseJsonLoose(text) {
  if (text && typeof text === "object") return text; // already parsed
  if (typeof text !== "string") {
    throw new Error("Expected a string to parse JSON from");
  }

  let s = text.trim();

  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  try {
    return JSON.parse(s);
  } catch {
    const start = s.search(/[[{]/);
    const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
    if (start !== -1 && end > start) {
      return JSON.parse(s.slice(start, end + 1));
    }
    throw new Error("Failed to parse JSON from model output");
  }
}

export const asStr = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v));
export const asArr = (v) => (Array.isArray(v) ? v : []);
export const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
