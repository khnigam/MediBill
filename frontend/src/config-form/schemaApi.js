import { advantageAuthHeaders } from "../program-config-advantage/http";
import {
  advantageOptionsToSchemaDoc,
  getAdvantageListSource,
  loadAdvantageOptionsBundle
} from "../program-config-advantage/optionsBundle";
import {
  normalizeUserSearchRows
} from "./userSearchConfig";
async function fetchProgramFormSchema(formConfigKey = null) {
  const raw = await loadAdvantageOptionsBundle();
  return advantageOptionsToSchemaDoc(raw, formConfigKey);
}
async function fetchDatasourceList(source) {
  const raw = await loadAdvantageOptionsBundle();
  return getAdvantageListSource(raw, source);
}
const datasourceCache = /* @__PURE__ */ new Map();
function getDatasourceCached(source) {
  const hit = datasourceCache.get(source);
  if (hit) return hit;
  const p = fetchDatasourceList(source);
  datasourceCache.set(source, p);
  return p;
}
async function searchUsers(_query) {
  return [];
}
async function searchUsersRemote(query, cfg) {
  const template = cfg.search_url_template?.trim();
  if (!template) return [];
  const q = query.trim();
  const enc = encodeURIComponent(q);
  const url = template.split("{query}").join(enc).split("{q}").join(enc);
  const res = await fetch(url, { headers: advantageAuthHeaders() });
  if (!res.ok) {
    throw new Error(`User search failed (${res.status})`);
  }
  const payload = await res.json();
  return normalizeUserSearchRows(payload, cfg);
}
export {
  fetchDatasourceList,
  fetchProgramFormSchema,
  getDatasourceCached,
  searchUsers,
  searchUsersRemote
};
