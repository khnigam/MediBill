import { useEffect, useState } from "react";
import type { FieldSchema } from "./types";
import { getDatasourceCached } from "./schemaApi";

export function useStaticOptions(field: FieldSchema | undefined) {
  const [options, setOptions] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!field || field.type !== "select") return;
    const raw = field.options;
    if (Array.isArray(raw)) {
      setOptions(raw as string[]);
      return;
    }
    if (!raw) {
      setOptions([]);
      return;
    }
    if (typeof raw === "object" && "source" in raw) {
      const source = String((raw as { source: string }).source);
      let cancelled = false;
      getDatasourceCached(source)
        .then((list) => {
          if (!cancelled) setOptions(list);
        })
        .catch(() => {
          if (!cancelled) setErr(`Could not load ${source}`);
        });
      return () => {
        cancelled = true;
      };
    }
    setOptions([]);
  }, [field]);

  return { options, err };
}
