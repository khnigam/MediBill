import { useCallback, useMemo, useState } from "react";
import type { BlockSchema, FormState } from "./types";
import { buildInitialFormState, hydrateFormStateFromMergedConfig, setAtPath } from "./programFormLogic";

export function useProgramFormState() {
  const [formState, setFormState] = useState<FormState>({});

  const reset = useCallback(
    (nextBlocks: BlockSchema[]) => {
      setFormState(buildInitialFormState(nextBlocks));
    },
    []
  );

  const initializeFromSchemaAndMerged = useCallback(
    (blocks: BlockSchema[], merged: Record<string, unknown>, opts?: { defaultAwardName?: string }) => {
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
    (blockId: string, path: string[], value: unknown) => {
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
      setBlockPath,
    }),
    [formState, reset, initializeFromSchemaAndMerged, setBlockPath]
  );
}
