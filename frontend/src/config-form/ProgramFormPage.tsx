import React, { useEffect, useState } from "react";
import { BlockCard } from "./BlockCard";
import { ProgramFormRemoteContext } from "./ProgramFormRemoteContext";
import { fetchProgramFormSchema } from "./schemaApi";
import type { SchemaDoc } from "./types";
import { buildProgramConfigApiPayload } from "./programFormLogic";
import { useProgramFormState } from "./useProgramFormState";

export default function ProgramFormPage() {
  const [schema, setSchema] = useState<SchemaDoc | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { formState, reset, setBlockPath } = useProgramFormState();

  useEffect(() => {
    let cancelled = false;
    fetchProgramFormSchema()
      .then((doc) => {
        if (cancelled) return;
        setSchema(doc);
        reset(doc.blocks);
        setLoadError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e.message ?? "Failed to load schema");
      });
    return () => {
      cancelled = true;
    };
  }, [reset]);

  return (
    <div className="min-w-0 w-full max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Program configuration</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Layout, lists, and user search load from Advantage codetest (
            <code className="rounded bg-gray-100 px-1">/appreciation_config/options</code>
            ). Set <code className="rounded bg-gray-100 px-1">REACT_APP_ADVANTAGE_CONFIG_TOKEN</code> in{" "}
            <code className="rounded bg-gray-100 px-1">.env.local</code>. State stays in the browser until you add a
            save API.
          </p>
        </header>

        {loadError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError}
          </div>
        )}

        {!schema && !loadError && (
          <p className="text-sm text-gray-500">Loading configuration schema…</p>
        )}

        {schema && (
          <ProgramFormRemoteContext.Provider value={schema.external_datasources ?? null}>
            <div className="flex flex-col gap-8">
              {schema.blocks.map((block) => (
                <BlockCard
                  key={block.block_id}
                  block={block}
                  formState={formState}
                  setBlockPath={setBlockPath}
                />
              ))}
            </div>
          </ProgramFormRemoteContext.Provider>
        )}

        {schema && (
          <div className="mt-10 space-y-4">
            <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
              <summary className="cursor-pointer font-semibold text-gray-800">
                Debug: API payload (upsert shape)
              </summary>
              <p className="mt-2 text-xs text-gray-500">
                <code className="rounded bg-gray-100 px-1">multi_select_search</code> fields serialize to numeric id
                arrays (e.g. <code className="rounded bg-gray-100 px-1">block_rule.user_ids</code>).
              </p>
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                {JSON.stringify(buildProgramConfigApiPayload(formState, schema.blocks), null, 2)}
              </pre>
            </details>
            <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
              <summary className="cursor-pointer font-semibold text-gray-800">
                Debug: live form state (JSON)
              </summary>
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                {JSON.stringify(formState, null, 2)}
              </pre>
            </details>
          </div>
        )}
    </div>
  );
}
