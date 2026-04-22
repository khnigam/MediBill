import { useCallback, useMemo, useState } from "react";
import { buildInitialFormState, hydrateFormStateFromMergedConfig, setAtPath } from "./programFormLogic";
function useProgramFormState() {
  const [formState, setFormState] = useState({});
  const reset = useCallback(
    (nextBlocks) => {
      setFormState(buildInitialFormState(nextBlocks));
    },
    []
  );
  const initializeFromSchemaAndMerged = useCallback(
    (blocks, merged, opts) => {
      let state = hydrateFormStateFromMergedConfig(merged, blocks);
      const n = opts?.defaultAwardName?.trim();
      if (n) {
        const bi = state.basic_information ?? {};
        const cur = bi.name;
        if (typeof cur !== "string" || !cur.trim()) {
          state = { ...state, basic_information: { ...bi, name: n } };
        }
      }
      setFormState(state);
    },
    []
  );
  const setBlockPath = useCallback(
    (blockId, path, value) => {
      setFormState((prev) => {
        const block = prev[blockId] ?? {};
        const nextBlock = setAtPath({ ...block }, path, value);
        return { ...prev, [blockId]: nextBlock };
      });
    },
    []
  );
  return useMemo(
    () => ({
      formState,
      setFormState,
      reset,
      initializeFromSchemaAndMerged,
      setBlockPath
    }),
    [formState, reset, initializeFromSchemaAndMerged, setBlockPath]
  );
}
export {
  useProgramFormState
};
