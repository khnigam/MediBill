import { corporateIdQueryString } from "./corporateIdSearchParam";

export const APPRECIATE_CORPORATE_CONFIG = "appreciate_corporate_config";
export const AWARDING_CORPORATE_CONFIG = "awarding_corporate_config";
export const NOMINATION_CORPORATE_CONFIG = "nomination_corporate_config";
export const APPRECIATE_CATEGORY_CONFIG = "appreciate_category_config";
export const AWARDING_CATEGORY_CONFIG = "awarding_category_config";
export const NOMINATION_CATEGORY_CONFIG = "nomination_category_config";

export const CORPORATE_FORM_CONFIG_KEYS = [
  APPRECIATE_CORPORATE_CONFIG,
  AWARDING_CORPORATE_CONFIG,
  NOMINATION_CORPORATE_CONFIG
];
export const CATEGORY_FORM_CONFIG_KEYS = [
  APPRECIATE_CATEGORY_CONFIG,
  AWARDING_CATEGORY_CONFIG,
  NOMINATION_CATEGORY_CONFIG
];
export const STANDALONE_FORM_CONFIG_KEYS = [...CORPORATE_FORM_CONFIG_KEYS, ...CATEGORY_FORM_CONFIG_KEYS];

export function normalizeFormConfigKey(param) {
  if (param == null || typeof param !== "string") return null;
  const k = param.trim();
  return STANDALONE_FORM_CONFIG_KEYS.includes(k) ? k : null;
}

export function isCorporateFormConfigKey(key) {
  return Boolean(key && CORPORATE_FORM_CONFIG_KEYS.includes(key));
}

export function isCategoryFormConfigKey(key) {
  return Boolean(key && CATEGORY_FORM_CONFIG_KEYS.includes(key));
}

/** Maps {@code form_config_key} to API {@code config_type}: nonmonetary | monetary | nomination. */
export function configTypeForFormConfigKey(key) {
  if (!key) return "nonmonetary";
  if (key.startsWith("awarding_")) return "monetary";
  if (key.startsWith("nomination_")) return "nomination";
  return "nonmonetary";
}

/** Maps program form URL context to API {@code upsert_type}: corporate | category | individual (badge / create). */
export function upsertTypeForProgramForm(formConfigKey) {
  if (isCorporateFormConfigKey(formConfigKey)) return "corporate";
  if (isCategoryFormConfigKey(formConfigKey)) return "category";
  return "individual";
}

export function programFormQuery(corporateId, formConfigKey, extra = {}) {
  const q = new URLSearchParams(corporateIdQueryString(corporateId));
  q.set("form_config_key", formConfigKey);
  if (extra.is_category_enabled) q.set("is_category_enabled", "1");
  if (extra.category_id) q.set("category_id", String(extra.category_id));
  return q.toString();
}

export function programFormPath(corporateId, formConfigKey, extra = {}) {
  return `/program-config/form?${programFormQuery(corporateId, formConfigKey, extra)}`;
}
