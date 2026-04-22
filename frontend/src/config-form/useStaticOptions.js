import { useEffect, useState } from "react";
import { getDatasourceCached } from "./schemaApi";
function useStaticOptions(field) {
  const [options, setOptions] = useState([]);
  const [err, setErr] = useState(null);
  useEffect(() => {
    if (!field || field.type !== "select") return;
    const raw = field.options;
    if (Array.isArray(raw)) {
      setOptions(raw);
      return;
    }
    if (!raw) {
      setOptions([]);
      return;
    }
    if (typeof raw === "object" && "source" in raw) {
      const source = String(raw.source);
      let cancelled = false;
      getDatasourceCached(source).then((list) => {
        if (!cancelled) setOptions(list);
      }).catch(() => {
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
export {
  useStaticOptions
};
