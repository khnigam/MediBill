import React, { useEffect, useState } from "react";
import { searchUsers, searchUsersRemote } from "./schemaApi";
import type { RemoteUserSearchOptions } from "./userSearchConfig";

export type SelectedUser = { id: string; label: string };

export function MultiSelectSearchField({
  placeholder,
  value,
  onChange,
  remote,
}: {
  placeholder?: string;
  value: unknown;
  onChange: (next: SelectedUser[]) => void;
  /** When set, calls configured HTTP search instead of the local mock `/users/search`. */
  remote?: RemoteUserSearchOptions | null;
}) {
  const selected: SelectedUser[] = Array.isArray(value)
    ? (value as unknown[]).map((row) => {
        if (row && typeof row === "object" && "id" in row) {
          const o = row as { id: unknown; label?: unknown };
          return { id: String(o.id), label: String(o.label ?? o.id) };
        }
        return { id: String(row), label: String(row) };
      })
    : [];

  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SelectedUser[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      const run = remote
        ? searchUsersRemote(q, remote)
        : searchUsers(q);
      run
        .then((list) => {
          if (!cancelled) setHits(list);
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        });
    }, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, remote]);

  const remove = (id: string) => {
    onChange(selected.filter((s) => s.id !== id));
  };

  const add = (u: SelectedUser) => {
    if (selected.some((s) => s.id === u.id)) return;
    onChange([...selected, u]);
    setQ("");
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
            >
              {s.label}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-indigo-200"
                aria-label={`Remove ${s.label}`}
                onClick={() => remove(s.id)}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="min-w-[8rem] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
            placeholder={placeholder ?? "Search…"}
            value={q}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
          />
          <span className="text-gray-400" aria-hidden>
            🔍
          </span>
        </div>
        {open && hits.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => add(h)}
                >
                  {h.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
