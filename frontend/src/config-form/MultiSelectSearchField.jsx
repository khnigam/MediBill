import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { searchUsers, searchUsersRemote } from "./schemaApi";
const REMOTE_SEARCH_MIN_CHARS = 3;
const REMOTE_SEARCH_DEBOUNCE_MS = 380;
function MultiSelectSearchField({
  placeholder,
  value,
  onChange,
  remote
}) {
  const selected = Array.isArray(value) ? value.map((row) => {
    if (row && typeof row === "object" && "id" in row) {
      const o = row;
      return { id: String(o.id), label: String(o.label ?? o.id) };
    }
    return { id: String(row), label: String(row) };
  }) : [];
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const needle = q.trim();
    if (needle.length < REMOTE_SEARCH_MIN_CHARS) {
      setHits([]);
      return void 0;
    }
    const t = window.setTimeout(() => {
      const run = remote ? searchUsersRemote(needle, remote) : searchUsers(needle);
      run.then((list) => {
        if (!cancelled) setHits(list);
      }).catch(() => {
        if (!cancelled) setHits([]);
      });
    }, REMOTE_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, remote]);
  const remove = (id) => {
    onChange(selected.filter((s) => s.id !== id));
  };
  const add = (u) => {
    if (selected.some((s) => s.id === u.id)) return;
    onChange([...selected, u]);
    setQ("");
    setOpen(false);
  };
  return /* @__PURE__ */ jsx("div", { className: "space-y-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex min-h-[44px] flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2", children: [
      selected.map((s) => /* @__PURE__ */ jsxs(
        "span",
        {
          className: "inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800",
          children: [
            s.label,
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: "rounded-full p-0.5 hover:bg-indigo-200",
                "aria-label": `Remove ${s.label}`,
                onClick: () => remove(s.id),
                children: "\xD7"
              }
            )
          ]
        },
        s.id
      )),
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "min-w-[8rem] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400",
          placeholder: placeholder ?? "Search\u2026",
          value: q,
          onFocus: () => setOpen(true),
          onChange: (e) => {
            setQ(e.target.value);
            setOpen(true);
          }
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "text-gray-400", "aria-hidden": true, children: "\u{1F50D}" })
    ] }),
    open && hits.length > 0 && /* @__PURE__ */ jsx("ul", { className: "absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg", children: hits.map((h) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
        onClick: () => add(h),
        children: h.label
      }
    ) }, h.id)) })
  ] }) });
}
export {
  MultiSelectSearchField
};
