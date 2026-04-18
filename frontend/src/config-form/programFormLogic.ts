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
