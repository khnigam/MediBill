import { jsx, jsxs } from "react/jsx-runtime";
import { getAtPath, matchesCondition } from "./programFormLogic";
import { RuleBuilderField } from "./RuleBuilderField";
import { MultiSelectSearchField } from "./MultiSelectSearchField";
import { useStaticOptions } from "./useStaticOptions";
import { useProgramFormRemote } from "./ProgramFormRemoteContext";
import { parseRemoteUserSearchOptions } from "./userSearchConfig";
function isStringPairSwitch(field) {
  return field.type === "switch" && Array.isArray(field.options) && field.options.length === 2 && field.options.every((o) => typeof o === "string");
}
function FieldShell({
  label,
  children,
  required
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5", children: [
    label && /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-semibold uppercase tracking-wide text-gray-500", children: [
      label,
      required ? /* @__PURE__ */ jsx("span", { className: "text-red-500", children: " *" }) : null
    ] }),
    children
  ] });
}
function FieldRenderer({
  blockId,
  field,
  path,
  blockValues,
  setBlockPath,
  columns
}) {
  const externalDs = useProgramFormRemote();
  if (!matchesCondition(field.visible_if, blockValues)) {
    return null;
  }
  if (!matchesCondition(field.depends_on, blockValues)) {
    return null;
  }
  const value = getAtPath(blockValues, path);
  const set = (v) => setBlockPath(blockId, path, v);
  const width = field.ui?.width ?? "half";
  const gridStyle = columns > 1 ? { gridColumn: width === "full" ? `span ${columns}` : "span 1" } : void 0;
  const wrap = (node) => /* @__PURE__ */ jsx("div", { style: gridStyle, className: "min-w-0", children: node }, field.key);
  if (field.type === "group" && field.fields?.length) {
    return wrap(
      /* @__PURE__ */ jsxs("fieldset", { className: "rounded-xl border border-dashed border-gray-300 bg-white/60 p-4", children: [
        /* @__PURE__ */ jsx("legend", { className: "px-1 text-sm font-semibold text-gray-800", children: field.label ?? field.key }),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: "mt-2 grid gap-4",
            style: {
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
            },
            children: field.fields.map((sub) => /* @__PURE__ */ jsx(
              FieldRenderer,
              {
                blockId,
                field: sub,
                path: [...path, sub.key],
                blockValues,
                setBlockPath,
                columns
              },
              sub.key
            ))
          }
        )
      ] })
    );
  }
  if (field.type === "text") {
    return wrap(
      /* @__PURE__ */ jsx(FieldShell, { label: field.label, required: field.required, children: /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          className: "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
          placeholder: field.placeholder,
          value: String(value ?? ""),
          onChange: (e) => set(e.target.value)
        }
      ) })
    );
  }
  if (field.type === "number") {
    return wrap(
      /* @__PURE__ */ jsx(FieldShell, { label: field.label, required: field.required, children: /* @__PURE__ */ jsx(
        "input",
        {
          type: "number",
          className: "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
          value: value === "" || value === void 0 || value === null ? "" : Number(value),
          onChange: (e) => {
            const raw = e.target.value;
            set(raw === "" ? "" : Number(raw));
          }
        }
      ) })
    );
  }
  if (field.type === "select") {
    return /* @__PURE__ */ jsx(
      SelectField,
      {
        field,
        value,
        set,
        gridStyle
      },
      field.key
    );
  }
  if (field.type === "switch") {
    if (isStringPairSwitch(field)) {
      const opts = field.options;
      const left = opts[0];
      const right = opts[1];
      const isRight = value === right;
      return wrap(
        /* @__PURE__ */ jsxs(FieldShell, { label: field.label, required: field.required, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              role: "switch",
              "aria-checked": isRight,
              className: `relative inline-flex h-8 w-14 shrink-0 rounded-full border transition ${isRight ? "border-indigo-500 bg-indigo-500" : "border-gray-300 bg-gray-200"}`,
              onClick: () => set(isRight ? left : right),
              children: /* @__PURE__ */ jsx(
                "span",
                {
                  className: `absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition ${isRight ? "left-6" : "left-0.5"}`
                }
              )
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500", children: String(value ?? left) === right ? right : left })
        ] })
      );
    }
    const on = Boolean(value);
    return wrap(
      /* @__PURE__ */ jsx(FieldShell, { label: field.label, required: field.required, children: /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          role: "switch",
          "aria-checked": on,
          className: `relative inline-flex h-8 w-14 shrink-0 rounded-full border transition ${on ? "border-indigo-500 bg-indigo-500" : "border-gray-300 bg-gray-200"}`,
          onClick: () => set(!on),
          children: /* @__PURE__ */ jsx(
            "span",
            {
              className: `absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition ${on ? "left-6" : "left-0.5"}`
            }
          )
        }
      ) })
    );
  }
  if (field.type === "file") {
    const meta = value;
    const existingUrl = meta?.existingUrl?.trim();
    return wrap(
      /* @__PURE__ */ jsx(FieldShell, { label: field.label, required: field.required, children: /* @__PURE__ */ jsxs("label", { className: "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600 hover:border-indigo-400 hover:bg-indigo-50/40", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "file",
            className: "hidden",
            accept: "image/png,image/jpeg,image/svg+xml",
            multiple: Boolean(field.multiple),
            onChange: (e) => {
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
              set({ name: f.name, size: f.size, file: f });
            }
          }
        ),
        existingUrl ? /* @__PURE__ */ jsx("img", { src: existingUrl, alt: "", className: "mb-3 max-h-32 max-w-full rounded-lg object-contain" }) : /* @__PURE__ */ jsx("span", { className: "text-2xl", "aria-hidden": true, children: "\u2601" }),
        /* @__PURE__ */ jsx("span", { className: "mt-2 font-medium", children: "Drag and drop or click to upload" }),
        /* @__PURE__ */ jsxs("span", { className: "mt-1 text-xs text-gray-500", children: [
          "PNG, JPG, SVG up to ",
          field.max_size_mb ?? 5,
          "MB"
        ] }),
        meta?.name && /* @__PURE__ */ jsx("span", { className: "mt-2 text-xs font-semibold text-indigo-700", children: meta.name })
      ] }) })
    );
  }
  if (field.type === "rule_builder") {
    return wrap(
      /* @__PURE__ */ jsx(FieldShell, { label: field.label, children: /* @__PURE__ */ jsx(RuleBuilderField, { field, value, onChange: set }) })
    );
  }
  if (field.type === "multi_select_search") {
    const remote = parseRemoteUserSearchOptions(field.options, externalDs);
    return wrap(
      /* @__PURE__ */ jsx(FieldShell, { label: field.label, required: field.required, children: /* @__PURE__ */ jsx(
        MultiSelectSearchField,
        {
          placeholder: field.placeholder,
          value,
          onChange: set,
          remote
        }
      ) })
    );
  }
  return wrap(
    /* @__PURE__ */ jsxs("div", { className: "rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900", children: [
      "Unsupported field type: ",
      /* @__PURE__ */ jsx("code", { children: field.type }),
      " (",
      field.key,
      ")"
    ] })
  );
}
function SelectField({
  field,
  value,
  set,
  gridStyle
}) {
  const { options, err } = useStaticOptions(field);
  return /* @__PURE__ */ jsx("div", { style: gridStyle, className: "min-w-0", children: /* @__PURE__ */ jsxs(FieldShell, { label: field.label, required: field.required, children: [
    /* @__PURE__ */ jsxs(
      "select",
      {
        className: "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
        value: String(value ?? ""),
        onChange: (e) => set(e.target.value),
        children: [
          /* @__PURE__ */ jsx("option", { value: "", children: field.placeholder ?? "Select\u2026" }),
          options.map((o) => /* @__PURE__ */ jsx("option", { value: o, children: o }, o))
        ]
      }
    ),
    err && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-600", children: err })
  ] }) });
}
export {
  FieldRenderer
};
