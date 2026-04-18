import React from "react";
import type { FieldSchema } from "./types";
import { getAtPath, matchesCondition } from "./programFormLogic";
import { RuleBuilderField } from "./RuleBuilderField";
import { MultiSelectSearchField } from "./MultiSelectSearchField";
import { useStaticOptions } from "./useStaticOptions";

function isStringPairSwitch(field: FieldSchema): boolean {
  return (
    field.type === "switch" &&
    Array.isArray(field.options) &&
    field.options.length === 2 &&
    field.options.every((o) => typeof o === "string")
  );
}

function FieldShell({
  label,
  children,
  required,
}: {
  label?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </span>
      )}
      {children}
    </div>
  );
}

export function FieldRenderer({
  blockId,
  field,
  path,
  blockValues,
  setBlockPath,
  columns,
}: {
  blockId: string;
  field: FieldSchema;
  path: string[];
  blockValues: Record<string, unknown>;
  setBlockPath: (blockId: string, path: string[], v: unknown) => void;
  columns: number;
}) {
  if (!matchesCondition(field.visible_if, blockValues)) {
    return null;
  }
  if (!matchesCondition(field.depends_on, blockValues)) {
    return null;
  }

  const value = getAtPath(blockValues, path) as unknown;
  const set = (v: unknown) => setBlockPath(blockId, path, v);

  const width = field.ui?.width ?? "half";
  const gridStyle: React.CSSProperties | undefined =
    columns > 1
      ? { gridColumn: width === "full" ? `span ${columns}` : "span 1" }
      : undefined;

  const wrap = (node: React.ReactNode) => (
    <div key={field.key} style={gridStyle} className="min-w-0">
      {node}
    </div>
  );

  if (field.type === "group" && field.fields?.length) {
    return wrap(
      <fieldset className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-800">
          {field.label ?? field.key}
        </legend>
        <div
          className="mt-2 grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {field.fields.map((sub) => (
            <FieldRenderer
              key={sub.key}
              blockId={blockId}
              field={sub}
              path={[...path, sub.key]}
              blockValues={blockValues}
              setBlockPath={setBlockPath}
              columns={columns}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "text") {
    return wrap(
      <FieldShell label={field.label} required={field.required}>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(e) => set(e.target.value)}
        />
      </FieldShell>
    );
  }

  if (field.type === "number") {
    return wrap(
      <FieldShell label={field.label} required={field.required}>
        <input
          type="number"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          value={value === "" || value === undefined || value === null ? "" : Number(value)}
          onChange={(e) => {
            const raw = e.target.value;
            set(raw === "" ? "" : Number(raw));
          }}
        />
      </FieldShell>
    );
  }

  if (field.type === "select") {
    return (
      <SelectField
        key={field.key}
        field={field}
        value={value}
        set={set}
        gridStyle={gridStyle}
      />
    );
  }

  if (field.type === "switch") {
    if (isStringPairSwitch(field)) {
      const opts = field.options as string[];
      const left = opts[0];
      const right = opts[1];
      const isRight = value === right;
      return wrap(
        <FieldShell label={field.label} required={field.required}>
          <button
            type="button"
            role="switch"
            aria-checked={isRight}
            className={`relative inline-flex h-8 w-14 shrink-0 rounded-full border transition ${
              isRight ? "border-indigo-500 bg-indigo-500" : "border-gray-300 bg-gray-200"
            }`}
            onClick={() => set(isRight ? left : right)}
          >
            <span
              className={`absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition ${
                isRight ? "left-6" : "left-0.5"
              }`}
            />
          </button>
          <span className="text-xs text-gray-500">
            {String(value ?? left) === right ? right : left}
          </span>
        </FieldShell>
      );
    }

    const on = Boolean(value);
    return wrap(
      <FieldShell label={field.label} required={field.required}>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          className={`relative inline-flex h-8 w-14 shrink-0 rounded-full border transition ${
            on ? "border-indigo-500 bg-indigo-500" : "border-gray-300 bg-gray-200"
          }`}
          onClick={() => set(!on)}
        >
          <span
            className={`absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition ${
              on ? "left-6" : "left-0.5"
            }`}
          />
        </button>
      </FieldShell>
    );
  }

  if (field.type === "file") {
    const meta = value as { name?: string; size?: number } | null;
    return wrap(
      <FieldShell label={field.label} required={field.required}>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600 hover:border-indigo-400 hover:bg-indigo-50/40">
          <input
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/svg+xml"
            multiple={Boolean(field.multiple)}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) {
                set(null);
                return;
              }
              const maxMb = field.max_size_mb ?? 5;
              if (f.size > maxMb * 1024 * 1024) {
                window.alert(`File must be at most ${maxMb}MB`);
                return;
              }
              set({ name: f.name, size: f.size });
            }}
          />
          <span className="text-2xl" aria-hidden>
            ☁
          </span>
          <span className="mt-2 font-medium">Drag and drop or click to upload</span>
          <span className="mt-1 text-xs text-gray-500">
            PNG, JPG, SVG up to {field.max_size_mb ?? 5}MB
          </span>
          {meta?.name && (
            <span className="mt-2 text-xs font-semibold text-indigo-700">{meta.name}</span>
          )}
        </label>
      </FieldShell>
    );
  }

  if (field.type === "rule_builder") {
    return wrap(
      <FieldShell label={field.label}>
        <RuleBuilderField field={field} value={value} onChange={set} />
      </FieldShell>
    );
  }

  if (field.type === "multi_select_search") {
    return wrap(
      <FieldShell label={field.label} required={field.required}>
        <MultiSelectSearchField
          placeholder={field.placeholder}
          value={value}
          onChange={set}
        />
      </FieldShell>
    );
  }

  return wrap(
    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      Unsupported field type: <code>{field.type}</code> ({field.key})
    </div>
  );
}

function SelectField({
  field,
  value,
  set,
  gridStyle,
}: {
  field: FieldSchema;
  value: unknown;
  set: (v: unknown) => void;
  gridStyle?: React.CSSProperties;
}) {
  const { options, err } = useStaticOptions(field);
  return (
    <div style={gridStyle} className="min-w-0">
      <FieldShell label={field.label} required={field.required}>
        <select
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          value={String(value ?? "")}
          onChange={(e) => set(e.target.value)}
        >
          <option value="">{field.placeholder ?? "Select…"}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </FieldShell>
    </div>
  );
}
