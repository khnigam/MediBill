import { advantageFetchJson } from "./http";

/** Codetest path for listing non-monetary awards (program config save uses {@code appreciationConfigApi}). */
export const NON_MONETARY_AWARDS_PATH = "/appreciation_config/nonomonetary_awards";

/**
 * Matches Rails {@code render json: { is_category_enabled, categories, badges }}.
 * Optional {@code can_create_badge}: when {@code false}, UI hides “create new badge”; omitted defaults to {@code true}.
 */
export type NonMonetaryAwardsResponse = {
  is_category_enabled: boolean;
  /** From API {@code can_create_badge}; defaults true if omitted. */
  can_create_badge: boolean;
  categoryEntries: CategoryCardModel[];
  badges: Record<string, unknown>[];
};

export type CategoryCardModel = {
  id: string;
  name: string;
  /** Present when API returns rich category objects; plain {@code id => name} has no image. */
  image_icon?: string | null;
};

/**
 * Parses {@code categories}: either {@code id => name} (Rails pluck to_h) or {@code id => { name, image_icon }}.
 */
export function parseCategoriesMap(raw: unknown): CategoryCardModel[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out: CategoryCardModel[] = [];
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") {
      out.push({ id, name: v });
      continue;
    }
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const name =
        typeof o.name === "string"
          ? o.name
          : typeof o.title === "string"
            ? o.title
            : String(id);
      const image_icon = typeof o.image_icon === "string" ? o.image_icon : null;
      out.push({ id, name, image_icon });
    }
  }
  return out;
}

export function parseNonMonetaryAwardsResponse(raw: unknown): NonMonetaryAwardsResponse | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const is_category_enabled = Boolean(o.is_category_enabled);
  const can_create_badge = o.can_create_badge !== false;
  const categoryEntries = parseCategoriesMap(o.categories);
  const badgesRaw = o.badges;
  const badges = Array.isArray(badgesRaw)
    ? badgesRaw.filter((b): b is Record<string, unknown> => b != null && typeof b === "object")
    : [];
  return { is_category_enabled, can_create_badge, categoryEntries, badges };
}

export async function fetchNonMonetaryAwards(corporateId = 900): Promise<unknown> {
  const q = new URLSearchParams({ corporate_id: String(corporateId) });
  return advantageFetchJson(`${NON_MONETARY_AWARDS_PATH}?${q}`);
}

/** Normalize badge → category id for filtering (Rails uses {@code generic_category_id}). */
export function badgeCategoryId(badge: Record<string, unknown>): string | null {
  const v = badge.generic_category_id ?? badge.category_id;
  if (v == null || v === "") return null;
  return String(v);
}

export function badgeDisplayName(badge: Record<string, unknown>): string {
  for (const key of ["name", "title", "award_name", "label"]) {
    const v = badge[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const id = badge.id;
  if (typeof id === "number" && Number.isFinite(id)) return `Award #${id}`;
  if (typeof id === "string" && id) return `Award #${id}`;
  return "Award";
}

export function badgePrimaryId(badge: Record<string, unknown>): string | null {
  const id = badge.id;
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  if (typeof id === "string" && id.trim()) return id.trim();
  return null;
}
