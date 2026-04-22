function parseFieldOnlyRemote(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) return null;
  const o = options;
  if (typeof o.search_url_template === "string" && o.search_url_template.trim()) {
    return o;
  }
  return null;
}
function parseRemoteUserSearchOptions(options, external) {
  const fromField = parseFieldOnlyRemote(options);
  if (fromField) {
    const proxy = fromField.use_backend_proxy ?? external?.use_backend_proxy !== false;
    return { ...fromField, use_backend_proxy: proxy };
  }
  const o = options;
  const src = o && typeof o.source === "string" ? o.source : "";
  const tmpl = external?.user_search_url_template?.trim();
  if (src === "users" && tmpl) {
    const userDisplayFields = external?.user_display_fields;
    return {
      source: "users",
      search_url_template: tmpl,
      results_path: external?.user_results_path ?? "users",
      id_field: external?.user_id_field ?? "id",
      display_fields: Array.isArray(userDisplayFields) && userDisplayFields.length ? userDisplayFields.map(String) : ["full_name", "email"],
      use_backend_proxy: external?.use_backend_proxy !== false
    };
  }
  return null;
}
function getAtPath(obj, path) {
  if (!path) return obj;
  let cur = obj;
  for (const seg of path.split(".")) {
    if (cur == null || typeof cur !== "object") return void 0;
    cur = cur[seg];
  }
  return cur;
}
function formatLabel(row, displayFields) {
  const parts = [];
  for (const k of displayFields) {
    const v = row[k];
    if (v == null || v === "") continue;
    parts.push(String(v).trim());
  }
  return parts.length ? parts.join(" \xB7 ") : "\u2014";
}
function normalizeUserSearchRows(payload, cfg) {
  const resultsPath = cfg.results_path?.trim() || "users";
  const idField = cfg.id_field?.trim() || "id";
  const displayFields = Array.isArray(cfg.display_fields) && cfg.display_fields.length ? cfg.display_fields.map(String) : ["full_name", "email"];
  const arr = getAtPath(payload, resultsPath);
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const row = item;
    const idVal = row[idField];
    if (idVal == null || idVal === "") continue;
    out.push({
      id: String(idVal),
      label: formatLabel(row, displayFields)
    });
  }
  return out;
}
export {
  normalizeUserSearchRows,
  parseRemoteUserSearchOptions
};
