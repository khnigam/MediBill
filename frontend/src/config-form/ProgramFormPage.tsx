import React, { useEffect, useState } from "react";
import { BlockCard } from "./BlockCard";
import { fetchProgramFormSchema } from "./schemaApi";
import type { SchemaDoc } from "./types";
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
            Layout and fields are loaded from the Spring Boot schema endpoint (
            <code className="rounded bg-gray-100 px-1">/api/program-form/schema</code>
            ). Updates are kept in React state for now; you can POST this JSON to a save endpoint
            when you add persistence.
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
        )}

        {schema && (
          <details className="mt-10 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-semibold text-gray-800">
              Debug: live form state (JSON)
            </summary>
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
              {JSON.stringify(formState, null, 2)}
            </pre>
          </details>
        )}
    </div>
  );
}
