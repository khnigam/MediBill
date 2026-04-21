import type {
  BlockConfigScopeVisibility,
  BlockSchema,
  ConditionSpec,
  FieldSchema,
  FormState,
  SchemaDoc,
} from "./types";

/** Injected first block: maps to options API {@code config_options}. */
export const CONFIG_SCOPE_BLOCK_ID = "config_scope";
export const CONFIG_SCOPE_INHERITANCE_KEY = "inheritance";
export const CONFIG_INHERITANCE_CORPORATE = "Corporate Wise";
export const CONFIG_INHERITANCE_CATEGORY = "Category Wise";
export const CONFIG_INHERITANCE_CUSTOM = "Custom";
export const TEAM_APPRECIATION_BLOCK_ID = "team_appreciation";

/** Defaults when options JSON omits {@code config_scope_visibility} on a block. */
const DEFAULT_CONFIG_SCOPE_BY_BLOCK_ID: Partial<Record<string, BlockConfigScopeVisibility>> = {
  [CONFIG_SCOPE_BLOCK_ID]: "always",
  [TEAM_APPRECIATION_BLOCK_ID]: "inherited_and_custom",
};

export function effectiveConfigScopeVisibility(block: BlockSchema): BlockConfigScopeVisibility {
  return (
    block.config_scope_visibility ??
    DEFAULT_CONFIG_SCOPE_BY_BLOCK_ID[block.block_id] ??
    "custom_only"
  );
}

export function isInheritedCorporateOrCategoryMode(formState: FormState): boolean {
  const v = formState[CONFIG_SCOPE_BLOCK_ID]?.[CONFIG_SCOPE_INHERITANCE_KEY];
  return v === CONFIG_INHERITANCE_CORPORATE || v === CONFIG_INHERITANCE_CATEGORY;
}

/**
 * Whether a block is shown in the form for the current inheritance mode.
 * {@code inheritedNarrowMode} = Corporate Wise or Category Wise selected.
 */
export function isBlockVisibleForConfigScope(block: BlockSchema, inheritedNarrowMode: boolean): boolean {
  const v = effectiveConfigScopeVisibility(block);
  if (inheritedNarrowMode) {
    return v === "always" || v === "inherited_and_custom" || v === "inherited_only";
  }
  return v !== "inherited_only";
}

export function filterBlocksForConfigScope(formState: FormState, blocks: BlockSchema[]): BlockSchema[] {
  const narrow = isInheritedCorporateOrCategoryMode(formState);
  return blocks.filter((b) => isBlockVisibleForConfigScope(b, narrow));
}

/** When corporate/category mode is on, only persist blocks that remain visible in that mode. */
export function upsertPayloadBlockFilter(
  formState: FormState,
  blocks: BlockSchema[]
): Set<string> | undefined {
  if (!isInheritedCorporateOrCategoryMode(formState)) return undefined;
  const ids = blocks.filter((b) => isBlockVisibleForConfigScope(b, true)).map((b) => b.block_id);
  return new Set(ids);
}

export function matchesCondition(
  spec: ConditionSpec | undefined,
  ctx: Record<string, unknown>
): boolean {
  if (!spec) return true;
  return ctx[spec.field] === spec.equals;
}

export function initialValueForField(field: FieldSchema): unknown {
  if (field.type === "group" && field.fields?.length) {
    const o: Record<string, unknown> = {};
    for (const f of field.fields) {
      o[f.key] = initialValueForField(f);
    }
    return o;
  }
  if (field.type === "rule_builder") {
    return {
      rules_join: "and",
      rules: [{ conditions_operator: "and", conditions: [{}] }],
    };
  }
  if (field.type === "multi_select_search") {
    return [];
  }
  if (field.type === "file") {
    return null;
  }
  if (field.default !== undefined) {
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

export function buildInitialFormState(blocks: BlockSchema[]): FormState {
  const state: FormState = {};
  for (const block of blocks) {
    const row: Record<string, unknown> = {};
    for (const field of block.fields ?? []) {
      row[field.key] = initialValueForField(field);
    }
    state[block.block_id] = row;
  }
  return state;
}

export function getAtPath(root: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = root;
  for (const p of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Immutable deep set — avoids accidental shared references between blocks. */
export function setAtPath(
  root: Record<string, unknown>,
  path: string[],
  value: unknown
): Record<string, unknown> {
  if (path.length === 0) return root;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return { ...root, [head]: value };
  }
  const child = root[head];
  const base =
    child !== null && typeof child === "object" && !Array.isArray(child)
      ? (child as Record<string, unknown>)
      : {};
  const nextChild = setAtPath(base, rest, value);
  return { ...root, [head]: nextChild };
}

export function collectFieldSchemas(fields: FieldSchema[] | undefined): FieldSchema[] {
  if (!fields?.length) return [];
  const out: FieldSchema[] = [];
  for (const f of fields) {
    out.push(f);
    if (f.type === "group" && f.fields?.length) {
      out.push(...collectFieldSchemas(f.fields));
    }
  }
  return out;
}

/**
 * Backend expects `user_ids` as a JSON number array, while the UI stores `{ id, label }[]` for chips.
 */
function selectedUsersToNumericIdArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const row of value) {
    if (row && typeof row === "object" && "id" in row) {
      const id = (row as { id: unknown }).id;
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

function serializeFieldValue(field: FieldSchema, value: unknown): unknown {
  if (field.type === "multi_select_search") {
    return selectedUsersToNumericIdArray(value);
  }
  if (field.type === "file") {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const o = value as Record<string, unknown>;
      if (typeof o.existingUrl === "string" && o.existingUrl.trim()) return o.existingUrl.trim();
      if (o.file instanceof File) return null;
    }
    return null;
  }
  if (field.type === "group" && field.fields?.length) {
    const obj =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    const nested: Record<string, unknown> = {};
    for (const sub of field.fields) {
      nested[sub.key] = serializeFieldValue(sub, obj[sub.key]);
    }
    return nested;
  }
  return value;
}

function serializeBlockRow(fields: FieldSchema[], row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    out[field.key] = serializeFieldValue(field, row[field.key]);
  }
  return out;
}

/**
 * One object per `block_id` (e.g. `block_rule.user_ids` as numbers) for POST /upsert-style bodies.
 * Optional {@code onlyBlockIds}: when set, only those blocks are serialized (narrow upsert).
 */
export function buildProgramConfigApiPayload(
  formState: FormState,
  blocks: BlockSchema[],
  onlyBlockIds?: Set<string>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const block of blocks) {
    if (onlyBlockIds && !onlyBlockIds.has(block.block_id)) continue;
    const row = formState[block.block_id] ?? {};
    payload[block.block_id] = serializeBlockRow(block.fields ?? [], row);
  }
  return payload;
}

/** Objects merge recursively; arrays and primitives are replaced by the override layer. */
export function deepMergeConfigRecords(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const bv = out[key];
    const ov = override[key];
    if (
      ov !== null &&
      typeof ov === "object" &&
      !Array.isArray(ov) &&
      bv !== null &&
      typeof bv === "object" &&
      !Array.isArray(bv)
    ) {
      out[key] = deepMergeConfigRecords(bv as Record<string, unknown>, ov as Record<string, unknown>);
    } else {
      out[key] = ov;
    }
  }
  return out;
}

export function mergeAppreciationCurrentLayers(data: {
  corporate: Record<string, unknown>;
  category: Record<string, unknown>;
  award: Record<string, unknown>;
}): Record<string, unknown> {
  return deepMergeConfigRecords(deepMergeConfigRecords(data.corporate, data.category), data.award);
}

function deserializeFieldValue(field: FieldSchema, raw: unknown, initialIn: unknown): unknown {
  if (field.type === "group" && field.fields?.length) {
    const base =
      initialIn !== null && typeof initialIn === "object" && !Array.isArray(initialIn)
        ? { ...(initialIn as Record<string, unknown>) }
        : (initialValueForField(field) as Record<string, unknown>);
    const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const out: Record<string, unknown> = { ...base };
    for (const sub of field.fields) {
      if (Object.prototype.hasOwnProperty.call(obj, sub.key)) {
        out[sub.key] = deserializeFieldValue(sub, obj[sub.key], base[sub.key]);
      }
    }
    return out;
  }
  if (raw === undefined) return initialIn;
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

export function hydrateFormStateFromMergedConfig(
  merged: Record<string, unknown>,
  blocks: BlockSchema[]
): FormState {
  const base = buildInitialFormState(blocks);
  for (const block of blocks) {
    const saved = merged[block.block_id];
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) continue;
    const s = saved as Record<string, unknown>;
    const row: Record<string, unknown> = { ...base[block.block_id] };
    for (const field of block.fields ?? []) {
      if (!Object.prototype.hasOwnProperty.call(s, field.key)) continue;
      row[field.key] = deserializeFieldValue(field, s[field.key], row[field.key]);
    }
    base[block.block_id] = row;
  }
  return base;
}

/** Hides program category dropdown when the awards list API has categories disabled. */
export function filterProgramSchemaForCategoryVisibility(doc: SchemaDoc, isCategoryEnabled: boolean): SchemaDoc {
  if (isCategoryEnabled) return doc;
  return {
    ...doc,
    blocks: doc.blocks.map((b) => {
      if (b.block_id !== "basic_information") return b;
      return { ...b, fields: (b.fields ?? []).filter((f) => f.key !== "category") };
    }),
  };
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

async function embedFilesInSerializedRow(
  fields: FieldSchema[],
  formRow: Record<string, unknown>,
  outRow: Record<string, unknown>
): Promise<void> {
  for (const f of fields) {
    if (f.type === "file") {
      const v = formRow[f.key];
      if (v && typeof v === "object" && !Array.isArray(v) && (v as { file?: unknown }).file instanceof File) {
        outRow[f.key] = await readFileAsDataURL((v as { file: File }).file);
      }
    }
    if (f.type === "group" && f.fields?.length) {
      const fr =
        formRow[f.key] && typeof formRow[f.key] === "object" && !Array.isArray(formRow[f.key])
          ? (formRow[f.key] as Record<string, unknown>)
          : {};
      const or =
        outRow[f.key] && typeof outRow[f.key] === "object" && !Array.isArray(outRow[f.key])
          ? { ...(outRow[f.key] as Record<string, unknown>) }
          : {};
      await embedFilesInSerializedRow(f.fields, fr, or);
      outRow[f.key] = or;
    }
  }
}

/** JSON upsert: new file picks become data URLs inside `config` (Rails jsonb); existing URLs pass through serialize. */
export async function buildProgramConfigApiPayloadWithEmbeddedFiles(
  formState: FormState,
  blocks: BlockSchema[],
  onlyBlockIds?: Set<string>
): Promise<Record<string, unknown>> {
  const out = buildProgramConfigApiPayload(formState, blocks, onlyBlockIds);
  for (const block of blocks) {
    if (onlyBlockIds && !onlyBlockIds.has(block.block_id)) continue;
    const row = formState[block.block_id];
    const outBlock = out[block.block_id];
    if (!row || !outBlock || typeof outBlock !== "object" || Array.isArray(outBlock)) continue;
    await embedFilesInSerializedRow(block.fields ?? [], row, outBlock as Record<string, unknown>);
  }
  return out;
}
