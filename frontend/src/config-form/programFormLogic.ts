import type { BlockSchema, ConditionSpec, FieldSchema, FormState } from "./types";

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
 */
export function buildProgramConfigApiPayload(
  formState: FormState,
  blocks: BlockSchema[]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const block of blocks) {
    const row = formState[block.block_id] ?? {};
    payload[block.block_id] = serializeBlockRow(block.fields ?? [], row);
  }
  return payload;
}
