import { advantageConfigBaseUrl } from "./env";
import { advantageFetchJson } from "./http";
const OPTIONS_PATH = "/appreciation_config/options";
let bundlePromise = null;
function loadAdvantageOptionsBundle() {
  if (!bundlePromise) {
    bundlePromise = advantageFetchJson(OPTIONS_PATH);
  }
  return bundlePromise;
}
function resetAdvantageOptionsBundle() {
  bundlePromise = null;
}
function toStringList(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push(item);
      continue;
    }
    if (item && typeof item === "object") {
      const o = item;
      if (typeof o.name === "string") {
        out.push(o.name);
        continue;
      }
      if (typeof o.label === "string") {
        out.push(o.label);
        continue;
      }
      if (typeof o.value === "string") {
        out.push(o.value);
        continue;
      }
      for (const v of Object.values(o)) {
        if (typeof v === "string" && v.trim()) {
          out.push(v.trim());
          break;
        }
      }
    }
  }
  return out;
}
function categoriesToSelectOptions(raw) {
  if (Array.isArray(raw)) {
    return toStringList(raw);
  }
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const entries = Object.entries(raw).filter(([, v]) => v != null && String(v).trim() !== "").map(([id, v]) => ({ id, label: String(v).trim() }));
  entries.sort((a, b) => {
    const na = Number(a.id);
    const nb = Number(b.id);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) {
      return na - nb;
    }
    return a.id.localeCompare(b.id);
  });
  return entries.map(({ id, label }) => `${id} \u2014 ${label}`);
}
function getAdvantageListSource(bundle, source) {
  if (!bundle || typeof bundle !== "object") return [];
  const o = bundle;
  const key = source.toLowerCase();
  if (key === "categories") {
    return categoriesToSelectOptions(o.categories);
  }
  const raw = o[key] ?? o[source];
  return toStringList(raw);
}
function buildExternalDatasources() {
  const base = advantageConfigBaseUrl();
  return {
    options_bundle_url: `${base}${OPTIONS_PATH}`,
    user_search_url_template: `${base}/appreciation_config/get_users_details?search={query}`,
    use_backend_proxy: false,
    user_results_path: "users",
    user_id_field: "id",
    user_display_fields: ["full_name", "email"],
    source_key_map: {
      categories: "categories",
      user_attributes: "user_attributes",
      user_profile_attributes: "user_profile_attributes",
      config_options: "config_options"
    }
  };
}
function extractBlocksFromOptionsPayload(o) {
  const sections = o.sections;
  if (Array.isArray(sections)) {
    return sections;
  }
  if (sections && typeof sections === "object" && !Array.isArray(sections)) {
    const inner = sections.blocks;
    if (Array.isArray(inner)) {
      return inner;
    }
  }
  return [];
}
/** Resolves blocks from a subtree of {@code /appreciation_config/options} (top-level or a {@code form_config_key} branch). */
function extractBlocksFromBundleNode(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node;
  if (Array.isArray(node.blocks)) return node.blocks;
  return extractBlocksFromOptionsPayload(node);
}
/** Builds the program form schema from {@code /appreciation_config/options} only — no synthetic blocks (e.g. include {@code config_scope} in the API when you need it). */
function advantageOptionsToSchemaDoc(raw, formConfigKey) {
  const o = raw && typeof raw === "object" ? raw : {};
  let branch = o;
  if (formConfigKey && typeof o[formConfigKey] === "object" && !Array.isArray(o[formConfigKey])) {
    branch = o[formConfigKey];
  }
  const blocks = extractBlocksFromBundleNode(branch);
  return {
    blocks,
    external_datasources: buildExternalDatasources()
  };
}
export {
  advantageOptionsToSchemaDoc,
  getAdvantageListSource,
  loadAdvantageOptionsBundle,
  resetAdvantageOptionsBundle
};
