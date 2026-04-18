import React from "react";
import type { BlockSchema, FormState } from "./types";
import { FieldRenderer } from "./FieldRenderer";

export function BlockCard({
  block,
  formState,
  setBlockPath,
}: {
  block: BlockSchema;
  formState: FormState;
  setBlockPath: (blockId: string, path: string[], v: unknown) => void;
}) {
  const columns = block.layout?.columns ?? 2;
  const blockValues = formState[block.block_id] ?? {};
  const fields = block.fields ?? [];
  const layoutFields = fields.filter((f) => !f.ui?.embedded_in_rule_builder);
  const headerFields = layoutFields.filter((f) => f.ui?.position === "top-right");
  const bodyFields = layoutFields.filter((f) => f.ui?.position !== "top-right");

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight text-gray-900">{block.title}</h2>
          {block.description ? (
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{block.description}</p>
          ) : null}
        </div>
        {headerFields.length > 0 && (
          <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-4">
            {headerFields.map((field) => (
              <FieldRenderer
                key={field.key}
                blockId={block.block_id}
                field={field}
                path={[field.key]}
                blockValues={blockValues}
                setBlockPath={setBlockPath}
                columns={columns}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="mt-6 grid gap-x-6 gap-y-5"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {bodyFields.map((field) => (
          <FieldRenderer
            key={field.key}
            blockId={block.block_id}
            field={field}
            path={[field.key]}
            blockValues={blockValues}
            setBlockPath={setBlockPath}
            columns={columns}
          />
        ))}
      </div>
    </section>
  );
}
