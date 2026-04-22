import { jsx, jsxs } from "react/jsx-runtime";
import { FieldRenderer } from "./FieldRenderer";
function BlockCard({
  block,
  formState,
  setBlockPath
}) {
  const columns = block.layout?.columns ?? 2;
  const blockValues = formState[block.block_id] ?? {};
  const fields = block.fields ?? [];
  const layoutFields = fields.filter((f) => !f.ui?.embedded_in_rule_builder);
  const headerFields = layoutFields.filter((f) => f.ui?.position === "top-right");
  const bodyFields = layoutFields.filter((f) => f.ui?.position !== "top-right");
  return /* @__PURE__ */ jsxs("section", { className: "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold tracking-tight text-gray-900", children: block.title }),
        block.description ? /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm leading-relaxed text-gray-500", children: block.description }) : null
      ] }),
      headerFields.length > 0 && /* @__PURE__ */ jsx("div", { className: "flex flex-shrink-0 flex-wrap items-center justify-end gap-4", children: headerFields.map((field) => /* @__PURE__ */ jsx(
        FieldRenderer,
        {
          blockId: block.block_id,
          field,
          path: [field.key],
          blockValues,
          setBlockPath,
          columns
        },
        field.key
      )) })
    ] }),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "mt-6 grid gap-x-6 gap-y-5",
        style: {
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
        },
        children: bodyFields.map((field) => /* @__PURE__ */ jsx(
          FieldRenderer,
          {
            blockId: block.block_id,
            field,
            path: [field.key],
            blockValues,
            setBlockPath,
            columns
          },
          field.key
        ))
      }
    )
  ] });
}
export {
  BlockCard
};
