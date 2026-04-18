import { useCallback, useMemo, useState } from "react";
import type { BlockSchema, FormState } from "./types";
import { buildInitialFormState, setAtPath } from "./programFormLogic";

export function useProgramFormState() {
  const [formState, setFormState] = useState<FormState>({});

  const reset = useCallback(
    (nextBlocks: BlockSchema[]) => {
      setFormState(buildInitialFormState(nextBlocks));
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
      setBlockPath,
    }),
    [formState, reset, setBlockPath]
  );
}
