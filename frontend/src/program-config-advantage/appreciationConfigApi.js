import { mergeAppreciationCurrentLayers } from "../config-form/programFormLogic";
import { advantageFetchJson, advantagePostMultipart } from "./http";
import { configTypeForFormConfigKey, isCategoryFormConfigKey, isCorporateFormConfigKey } from "./formConfigKeys";
const APPRECIATION_CONFIG_CURRENT_PATH = "/appreciation_config/current";
const APPRECIATION_CONFIG_UPSERT_PATH = "/appreciation_config/upsert";
/** Omit empty and sentinel {@code "0"} (never use 0/1 as client defaults for these params). */
function isUsableIdQueryValue(value) {
  const s = value != null ? String(value).trim() : "";
  return s.length > 0 && s !== "0";
}
function currentQueryOptionalIds(params) {
  const badgeId = (params.badgeId ?? "").toString().trim();
  const categoryId = (params.categoryId ?? "").toString().trim();
  const formConfigKey = params.formConfigKey ?? null;
  const out = {};
  if (isCorporateFormConfigKey(formConfigKey)) {
    return out;
  }
  if (isCategoryFormConfigKey(formConfigKey)) {
    if (isUsableIdQueryValue(categoryId)) out.category_id = categoryId;
    return out;
  }
  if (isUsableIdQueryValue(badgeId)) out.badge_id = badgeId;
  if (isUsableIdQueryValue(categoryId)) out.category_id = categoryId;
  return out;
}
function pickMergedProgramConfigFromCurrent(data, formConfigKey) {
  if (!data || typeof data !== "object") return {};
  if (isCorporateFormConfigKey(formConfigKey)) {
    return { ...data.corporate };
  }
  if (isCategoryFormConfigKey(formConfigKey)) {
    return { ...data.category };
  }
  return mergeAppreciationCurrentLayers(data);
}
function parseAppreciationConfigCurrentResponse(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw;
  const success = Boolean(o.success);
  const module_name = typeof o.module_name === "string" ? o.module_name : void 0;
  const info = typeof o.info === "string" ? o.info : void 0;
  let data;
  const d = o.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    const dr = d;
    const asObj = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
    data = {
      corporate: asObj(dr.corporate),
      category: asObj(dr.category),
      award: asObj(dr.award)
    };
  }
  return { success, module_name, data, info };
}
async function fetchAppreciationConfigCurrent(params) {
  const q = new URLSearchParams({
    corporate_id: String(params.corporateId),
    config_type: configTypeForFormConfigKey(params.formConfigKey ?? null)
  });
  const ids = currentQueryOptionalIds(params);
  if (ids.badge_id) q.set("badge_id", ids.badge_id);
  if (ids.category_id) q.set("category_id", ids.category_id);
  return advantageFetchJson(`${APPRECIATION_CONFIG_CURRENT_PATH}?${q.toString()}`);
}
function extractBasicInformationImageFile(formState) {
  const img = formState.basic_information?.image;
  if (img && typeof img === "object" && !Array.isArray(img) && img.file instanceof File) {
    return img.file;
  }
  return null;
}
async function upsertAppreciationConfig(body) {
  const fd = new FormData();
  fd.append("corporate_id", String(body.corporate_id));
  const badgeTrim = body.badge_id != null ? String(body.badge_id).trim() : "";
  if (isUsableIdQueryValue(badgeTrim)) {
    fd.append("badge_id", badgeTrim);
  }
  const categoryTrim = body.category_id != null ? String(body.category_id).trim() : "";
  if (isUsableIdQueryValue(categoryTrim)) {
    fd.append("category_id", categoryTrim);
  }
  fd.append("to_create", body.to_create ? "true" : "false");
  fd.append("config_type", body.config_type ?? "nonmonetary");
  fd.append("upsert_type", String(body.upsert_type ?? "individual"));
  if (body.form_config_key) {
    fd.append("form_config_key", String(body.form_config_key));
  }
  fd.append("config", JSON.stringify(body.config));
  const iconFile = body.icon_image ?? body.image_icon;
  if (iconFile) {
    fd.append("icon_image", iconFile, iconFile.name);
  }
  return advantagePostMultipart(APPRECIATION_CONFIG_UPSERT_PATH, fd);
}
export {
  APPRECIATION_CONFIG_CURRENT_PATH,
  APPRECIATION_CONFIG_UPSERT_PATH,
  extractBasicInformationImageFile,
  fetchAppreciationConfigCurrent,
  parseAppreciationConfigCurrentResponse,
  pickMergedProgramConfigFromCurrent,
  upsertAppreciationConfig
};
