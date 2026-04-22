const CONFIG_SCOPE_BLOCK_ID = "config_scope";
const CONFIG_SCOPE_INHERITANCE_KEY = "inheritance";
const CONFIG_INHERITANCE_CORPORATE = "Corporate Wise";
const CONFIG_INHERITANCE_CATEGORY = "Category Wise";
const CONFIG_INHERITANCE_CUSTOM = "Custom";
const TEAM_APPRECIATION_BLOCK_ID = "team_appreciation";
const DEFAULT_CONFIG_SCOPE_BY_BLOCK_ID = {
  [CONFIG_SCOPE_BLOCK_ID]: "always",
  [TEAM_APPRECIATION_BLOCK_ID]: "inherited_and_custom"
};
function effectiveConfigScopeVisibility(block) {
  return block.config_scope_visibility ?? DEFAULT_CONFIG_SCOPE_BY_BLOCK_ID[block.block_id] ?? "custom_only";
}
function isInheritedCorporateOrCategoryMode(formState) {
  const v = formState[CONFIG_SCOPE_BLOCK_ID]?.[CONFIG_SCOPE_INHERITANCE_KEY];
  return v === CONFIG_INHERITANCE_CORPORATE || v === CONFIG_INHERITANCE_CATEGORY;
}
function isBlockVisibleForConfigScope(block, inheritedNarrowMode) {
  const v = effectiveConfigScopeVisibility(block);
  if (inheritedNarrowMode) {
    return v === "always" || v === "inherited_and_custom" || v === "inherited_only";
  }
  return v !== "inherited_only";
}
function filterBlocksForConfigScope(formState, blocks) {
  const narrow = isInheritedCorporateOrCategoryMode(formState);
  return blocks.filter((b) => isBlockVisibleForConfigScope(b, narrow));
}
function upsertPayloadBlockFilter(formState, blocks) {
  if (!isInheritedCorporateOrCategoryMode(formState)) return void 0;
  const ids = blocks.filter((b) => isBlockVisibleForConfigScope(b, true)).map((b) => b.block_id);
  return new Set(ids);
}
function matchesCondition(spec, ctx) {
  if (!spec) return true;
  return ctx[spec.field] === spec.equals;
}
function initialValueForField(field) {
  if (field.type === "group" && field.fields?.length) {
    const o = {};
    for (const f of field.fields) {
      o[f.key] = initialValueForField(f);
    }
    return o;
  }
  if (field.type === "rule_builder") {
    return {
      rules_join: "and",
      rules: [{ conditions_operator: "and", conditions: [{}] }]
    };
  }
  if (field.type === "multi_select_search") {
    return [];
  }
  if (field.type === "file") {
    return null;
  }
  if (field.default !== void 0) {
    return field.default;
  }
  if (field.type === "number") {
    return 0;
  }
  if (field.type === "switch") {
    if (Array.isArray(field.options) && field.options.length > 0) {
      return field.options[0];
    }
    return false;
  }
  if (field.type === "text") {
    return "";
  }
  return null;
}
function buildInitialFormState(blocks) {
  const state = {};
  for (const block of blocks) {
    const row = {};
    for (const field of block.fields ?? []) {
      row[field.key] = initialValueForField(field);
    }
    state[block.block_id] = row;
  }
  return state;
}
function getAtPath(root, path) {
  let cur = root;
  for (const p of path) {
    if (cur == null || typeof cur !== "object") return void 0;
    cur = cur[p];
  }
  return cur;
}
function setAtPath(root, path, value) {
  if (path.length === 0) return root;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return { ...root, [head]: value };
  }
  const child = root[head];
  const base = child !== null && typeof child === "object" && !Array.isArray(child) ? child : {};
  const nextChild = setAtPath(base, rest, value);
  return { ...root, [head]: nextChild };
}
function collectFieldSchemas(fields) {
  if (!fields?.length) return [];
  const out = [];
  for (const f of fields) {
    out.push(f);
    if (f.type === "group" && f.fields?.length) {
      out.push(...collectFieldSchemas(f.fields));
    }
  }
  return out;
}
function selectedUsersToNumericIdArray(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const row of value) {
    if (row && typeof row === "object" && "id" in row) {
      const id = row.id;
      const n = typeof id === "number" && Number.isFinite(id) ? id : Number(String(id).trim());
      if (Number.isFinite(n)) out.push(n);
      continue;
    }
    if (typeof row === "number" && Number.isFinite(row)) {
      out.push(row);
      continue;
    }
    if (typeof row === "string" && /^\d+$/.test(row.trim())) {
      out.push(Number(row.trim()));
    }
  }
  return out;
}
function serializeFieldValue(field, value) {
  if (field.type === "multi_select_search") {
    return selectedUsersToNumericIdArray(value);
  }
  if (field.type === "file") {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const o = value;
      if (typeof o.existingUrl === "string" && o.existingUrl.trim()) return o.existingUrl.trim();
      if (o.file instanceof File) return null;
    }
    return null;
  }
  if (field.type === "group" && field.fields?.length) {
    const obj = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const nested = {};
    for (const sub of field.fields) {
      nested[sub.key] = serializeFieldValue(sub, obj[sub.key]);
    }
    return nested;
  }
  return value;
}
function serializeBlockRow(fields, row) {
  const out = {};
  for (const field of fields) {
    out[field.key] = serializeFieldValue(field, row[field.key]);
  }
  return out;
}
function buildProgramConfigApiPayload(formState, blocks, onlyBlockIds) {
  const payload = {};
  for (const block of blocks) {
    if (onlyBlockIds && !onlyBlockIds.has(block.block_id)) continue;
    const row = formState[block.block_id] ?? {};
    payload[block.block_id] = serializeBlockRow(block.fields ?? [], row);
  }
  return payload;
}
function deepMergeConfigRecords(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override)) {
    const bv = out[key];
    const ov = override[key];
    if (ov !== null && typeof ov === "object" && !Array.isArray(ov) && bv !== null && typeof bv === "object" && !Array.isArray(bv)) {
      out[key] = deepMergeConfigRecords(bv, ov);
    } else {
      out[key] = ov;
    }
  }
  return out;
}
function mergeAppreciationCurrentLayers(data) {
  return deepMergeConfigRecords(deepMergeConfigRecords(data.corporate, data.category), data.award);
}
function deserializeFieldValue(field, raw, initialIn) {
  if (field.type === "group" && field.fields?.length) {
    const base = initialIn !== null && typeof initialIn === "object" && !Array.isArray(initialIn) ? { ...initialIn } : initialValueForField(field);
    const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const out = { ...base };
    for (const sub of field.fields) {
      if (Object.prototype.hasOwnProperty.call(obj, sub.key)) {
        out[sub.key] = deserializeFieldValue(sub, obj[sub.key], base[sub.key]);
      }
    }
    return out;
  }
  if (raw === void 0) return initialIn;
  if (field.type === "multi_select_search") {
    if (!Array.isArray(raw)) return initialIn;
    return raw.map((id) => {
      const n = typeof id === "number" && Number.isFinite(id) ? id : Number(String(id).trim());
      const s = Number.isFinite(n) ? String(n) : String(id);
      return { id: s, label: s };
    });
  }
  if (field.type === "rule_builder") {
    return raw ?? initialIn;
  }
  if (field.type === "file") {
    if (typeof raw === "string" && raw.trim()) {
      return { name: "Current image", existingUrl: raw.trim() };
    }
    return initialIn;
  }
  if (field.type === "number") {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim() !== "") {
      const n = Number(raw);
      return Number.isFinite(n) ? n : initialIn;
    }
    return initialIn;
  }
  return raw;
}
function hydrateFormStateFromMergedConfig(merged, blocks) {
  const base = buildInitialFormState(blocks);
  for (const block of blocks) {
    const saved = merged[block.block_id];
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) continue;
    const s = saved;
    const row = { ...base[block.block_id] };
    for (const field of block.fields ?? []) {
      if (!Object.prototype.hasOwnProperty.call(s, field.key)) continue;
      row[field.key] = deserializeFieldValue(field, s[field.key], row[field.key]);
    }
    base[block.block_id] = row;
  }
  return base;
}
function filterProgramSchemaForCategoryVisibility(doc, isCategoryEnabled) {
  if (isCategoryEnabled) return doc;
  return {
    ...doc,
    blocks: doc.blocks.map((b) => {
      if (b.block_id !== "basic_information") return b;
      return { ...b, fields: (b.fields ?? []).filter((f) => f.key !== "category") };
    })
  };
}
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}
async function embedFilesInSerializedRow(fields, formRow, outRow) {
  for (const f of fields) {
    if (f.type === "file") {
      const v = formRow[f.key];
      if (v && typeof v === "object" && !Array.isArray(v) && v.file instanceof File) {
        outRow[f.key] = await readFileAsDataURL(v.file);
      }
    }
    if (f.type === "group" && f.fields?.length) {
      const fr = formRow[f.key] && typeof formRow[f.key] === "object" && !Array.isArray(formRow[f.key]) ? formRow[f.key] : {};
      const or = outRow[f.key] && typeof outRow[f.key] === "object" && !Array.isArray(outRow[f.key]) ? { ...outRow[f.key] } : {};
      await embedFilesInSerializedRow(f.fields, fr, or);
      outRow[f.key] = or;
    }
  }
}
async function buildProgramConfigApiPayloadWithEmbeddedFiles(formState, blocks, onlyBlockIds) {
  const out = buildProgramConfigApiPayload(formState, blocks, onlyBlockIds);
  for (const block of blocks) {
    if (onlyBlockIds && !onlyBlockIds.has(block.block_id)) continue;
    const row = formState[block.block_id];
    const outBlock = out[block.block_id];
    if (!row || !outBlock || typeof outBlock !== "object" || Array.isArray(outBlock)) continue;
    await embedFilesInSerializedRow(block.fields ?? [], row, outBlock);
  }
  return out;
}
export {
  CONFIG_INHERITANCE_CATEGORY,
  CONFIG_INHERITANCE_CORPORATE,
  CONFIG_INHERITANCE_CUSTOM,
  CONFIG_SCOPE_BLOCK_ID,
  CONFIG_SCOPE_INHERITANCE_KEY,
  TEAM_APPRECIATION_BLOCK_ID,
  buildInitialFormState,
  buildProgramConfigApiPayload,
  buildProgramConfigApiPayloadWithEmbeddedFiles,
  collectFieldSchemas,
  deepMergeConfigRecords,
  effectiveConfigScopeVisibility,
  filterBlocksForConfigScope,
  filterProgramSchemaForCategoryVisibility,
  getAtPath,
  hydrateFormStateFromMergedConfig,
  initialValueForField,
  isBlockVisibleForConfigScope,
  isInheritedCorporateOrCategoryMode,
  matchesCondition,
  mergeAppreciationCurrentLayers,
  readFileAsDataURL,
  setAtPath,
  upsertPayloadBlockFilter
};
