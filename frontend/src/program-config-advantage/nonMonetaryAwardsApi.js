import { advantageFetchJson } from "./http";
const NON_MONETARY_AWARDS_PATH = "/appreciation_config/nonomonetary_awards";
/**
 * Key used to match badges: API rows often use {@code generic_category_id} for badge.generic_category_id,
 * while {@code id} is the program category row id (URLs / category_id).
 */
function categoryRowMatchKey(entry) {
  if (!entry) return "";
  const g = entry.generic_category_id;
  if (g != null && String(g).trim() !== "") return String(g);
  return String(entry.id ?? "");
}
function parseCategoriesMap(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    const out = [];
    for (const row of raw) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const id = row.id != null ? String(row.id) : "";
      if (!id) continue;
      const name =
        typeof row.name === "string"
          ? row.name
          : typeof row.title === "string"
            ? row.title
            : id;
      const image_icon =
        typeof row.image_icon === "string"
          ? row.image_icon
          : typeof row.cdn_url === "string"
            ? row.cdn_url
            : null;
      const generic_category_id =
        row.generic_category_id != null && row.generic_category_id !== "" ? row.generic_category_id : null;
      out.push({ id, name, image_icon, generic_category_id });
    }
    return out;
  }
  if (typeof raw !== "object") return [];
  const out = [];
  for (const [id, v] of Object.entries(raw)) {
    if (typeof v === "string") {
      out.push({ id, name: v, image_icon: null, generic_category_id: null });
      continue;
    }
    if (v && typeof v === "object") {
      const o = v;
      const name =
        typeof o.name === "string" ? o.name : typeof o.title === "string" ? o.title : String(id);
      const image_icon =
        typeof o.image_icon === "string"
          ? o.image_icon
          : typeof o.cdn_url === "string"
            ? o.cdn_url
            : null;
      const generic_category_id =
        o.generic_category_id != null && o.generic_category_id !== "" ? o.generic_category_id : null;
      const rid = o.id != null ? String(o.id) : id;
      out.push({ id: rid, name, image_icon, generic_category_id });
    }
  }
  return out;
}
function parseNonMonetaryAwardsResponse(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw;
  const is_category_enabled = Boolean(o.is_category_enabled);
  const can_create_badge = o.can_create_badge !== false;
  const can_create_category = o.can_create_category !== false;
  const categoryEntries = parseCategoriesMap(o.categories);
  const badgesRaw = o.badges;
  const badges = Array.isArray(badgesRaw) ? badgesRaw.filter((b) => b != null && typeof b === "object") : [];
  return { is_category_enabled, can_create_badge, can_create_category, categoryEntries, badges };
}
async function fetchNonMonetaryAwards(corporateId = 900) {
  const q = new URLSearchParams({ corporate_id: String(corporateId) });
  return advantageFetchJson(`${NON_MONETARY_AWARDS_PATH}?${q}`);
}
function badgeCategoryId(badge) {
  const v = badge.generic_category_id ?? badge.category_id;
  if (v == null || v === "") return null;
  return String(v);
}
function badgeDisplayName(badge) {
  for (const key of ["name", "title", "award_name", "label"]) {
    const v = badge[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const id = badge.id;
  if (typeof id === "number" && Number.isFinite(id)) return `Award #${id}`;
  if (typeof id === "string" && id) return `Award #${id}`;
  return "Award";
}
function badgePrimaryId(badge) {
  const id = badge.id;
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  if (typeof id === "string" && id.trim()) return id.trim();
  return null;
}
export {
  NON_MONETARY_AWARDS_PATH,
  badgeCategoryId,
  badgeDisplayName,
  badgePrimaryId,
  categoryRowMatchKey,
  fetchNonMonetaryAwards,
  parseCategoriesMap,
  parseNonMonetaryAwardsResponse
};
