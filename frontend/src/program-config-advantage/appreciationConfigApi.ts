import { advantageFetchJson, advantagePostJson } from "./http";

export const APPRECIATION_CONFIG_CURRENT_PATH = "/appreciation_config/current";
export const APPRECIATION_CONFIG_UPSERT_PATH = "/appreciation_config/upsert";

/** Rails `current` action: corporate defaults, optional category overlay, award-specific overlay. */
export type AppreciationConfigCurrentData = {
  corporate: Record<string, unknown>;
  category: Record<string, unknown>;
  award: Record<string, unknown>;
};

export type AppreciationConfigCurrentResponse = {
  success: boolean;
  module_name?: string;
  data?: AppreciationConfigCurrentData;
  info?: string;
};

export function parseAppreciationConfigCurrentResponse(raw: unknown): AppreciationConfigCurrentResponse | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const success = Boolean(o.success);
  const module_name = typeof o.module_name === "string" ? o.module_name : undefined;
  const info = typeof o.info === "string" ? o.info : undefined;
  let data: AppreciationConfigCurrentData | undefined;
  const d = o.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    const dr = d as Record<string, unknown>;
    const asObj = (v: unknown) =>
      v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    data = {
      corporate: asObj(dr.corporate),
      category: asObj(dr.category),
      award: asObj(dr.award),
    };
  }
  return { success, module_name, data, info };
}

export async function fetchAppreciationConfigCurrent(params: {
  corporateId: number;
  badgeId: string;
  categoryId?: string | null;
}): Promise<unknown> {
  const q = new URLSearchParams({
    corporate_id: String(params.corporateId),
    badge_id: params.badgeId,
  });
  if (params.categoryId != null && String(params.categoryId).trim() !== "") {
    q.set("category_id", String(params.categoryId).trim());
  }
  return advantageFetchJson(`${APPRECIATION_CONFIG_CURRENT_PATH}?${q.toString()}`);
}

export type AppreciationConfigUpsertBody = {
  corporate_id: number;
  /** Omit or empty when {@code to_create} creates a new NonmonetaryAward first. */
  badge_id?: string | null;
  category_id?: string | null;
  config_type?: string;
  to_create: boolean;
  config: Record<string, unknown>;
};

export async function upsertAppreciationConfig(body: AppreciationConfigUpsertBody): Promise<unknown> {
  const badge_id =
    body.badge_id != null && String(body.badge_id).trim() !== "" ? String(body.badge_id).trim() : "";
  return advantagePostJson(APPRECIATION_CONFIG_UPSERT_PATH, {
    corporate_id: body.corporate_id,
    badge_id,
    category_id: body.category_id ?? "",
    config_type: body.config_type ?? "non_monetary_award",
    to_create: body.to_create,
    config: body.config,
  });
}
