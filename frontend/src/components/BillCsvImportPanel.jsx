import React, { useRef, useState } from "react";
import {
  parsePurchaseBillRows,
  previewRowsFromAiExtracted,
  medicinesSortedByMatch,
  buildPurchaseRowsFromPreview,
} from "../utils/purchaseBillCsv";

const sampleHref = `${process.env.PUBLIC_URL || ""}/samples/purchase-bill-sample.csv`;

const DEFAULT_API = "http://localhost:8080";

/**
 * Upload a distributor bill CSV, or a PDF/photo for server-side AI extraction → same preview + map flow.
 * **Controlled mapping** — dropdown is pre-filled with best fuzzy match; user corrects if needed.
 */
export default function BillCsvImportPanel({
  medicineList,
  disabled,
  emptyRowTemplate,
  onApply,
  apiBaseUrl = DEFAULT_API,
}) {
  const [preview, setPreview] = useState(null);
  const [parseError, setParseError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    setParseError("");
    if (!f) return;
    if (!medicineList?.length) {
      setParseError("Medicine catalogue is still loading. Try again in a moment.");
      setPreview(null);
      e.target.value = "";
      return;
    }

    const name = (f.name || "").toLowerCase();
    const mime = (f.type || "").toLowerCase();
    const isCsv = name.endsWith(".csv") || mime.includes("csv") || mime === "text/plain";

    if (isCsv) {
      if (!name.endsWith(".csv") && !mime.includes("csv")) {
        setParseError("For plain text upload, use a .csv file.");
        setPreview(null);
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const { previewRows, error } = parsePurchaseBillRows(text, medicineList);
        if (error) {
          setParseError(error);
          setPreview(null);
          return;
        }
        if (!previewRows.length) {
          setParseError("No data rows found after the header.");
          setPreview(null);
          return;
        }
        setPreview({ rows: previewRows });
      };
      reader.onerror = () => {
        setParseError("Could not read the file.");
        setPreview(null);
      };
      reader.readAsText(f, "UTF-8");
      e.target.value = "";
      return;
    }

    const isPdf = name.endsWith(".pdf") || mime.includes("pdf");
    const isImage =
      mime.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(f.name || "");
    if (!isPdf && !isImage) {
      setParseError("Choose a .csv file, a PDF invoice, or a photo (JPEG / PNG / WebP).");
      setPreview(null);
      e.target.value = "";
      return;
    }

    setAiBusy(true);
    setPreview(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/purchases/bill-ai-extract`, {
        method: "POST",
        body: fd,
      });
      const raw = await res.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }
      if (!res.ok) {
        const detail =
          (data && (data.message || data.error)) ||
          (res.status === 503
            ? "AI is not configured on the server: set GEMINI_API_KEY or GOOGLE_API_KEY for the Java process (Run Configuration → Environment), not only in the React .env."
            : raw || "Request failed");
        setParseError(`${res.status}: ${String(detail)}`);
        return;
      }
      const { previewRows, error } = previewRowsFromAiExtracted(data?.lines, medicineList);
      if (error) {
        setParseError(error);
        return;
      }
      setPreview({ rows: previewRows });
    } catch (err) {
      setParseError(err?.message || "Network error while calling AI extract.");
      setPreview(null);
    } finally {
      setAiBusy(false);
      e.target.value = "";
    }
  };

  const updateMappedId = (index, mappedMedicineId) => {
    setPreview((p) => {
      if (!p) return p;
      const rows = p.rows.map((r, i) => (i === index ? { ...r, mappedMedicineId } : r));
      return { rows };
    });
  };

  const handleApply = () => {
    if (!preview?.rows.length) return;
    const built = buildPurchaseRowsFromPreview(preview.rows, medicineList, emptyRowTemplate);
    onApply(built);
    setPreview(null);
    setParseError("");
  };

  const handleClear = () => {
    setPreview(null);
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <section className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-indigo-950">Bill upload (CSV or AI)</h2>
        <a
          href={sampleHref}
          download="purchase-bill-sample.csv"
          className="text-sm font-medium text-indigo-700 underline hover:text-indigo-900"
        >
          Download sample CSV
        </a>
      </div>
      <p className="mb-3 text-xs text-gray-600">
        Upload a <strong>CSV</strong> export, or a <strong>PDF / clear photo</strong> of the printed invoice. The
        server calls a vision model (API key stays on the server) and fills the same preview table; only{" "}
        <strong>map to your medicine</strong> is edited here. Review all columns before applying — AI can misread
        blurry rows.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,application/pdf,image/jpeg,image/png,image/webp,.pdf"
          disabled={disabled || aiBusy}
          onChange={handleFile}
          className="block text-sm file:mr-3 file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700"
        />
        {aiBusy && (
          <span className="text-sm font-medium text-indigo-800" role="status">
            Extracting with AI…
          </span>
        )}
        {preview && (
          <>
            <button
              type="button"
              disabled={disabled || aiBusy}
              onClick={handleApply}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
            >
              Apply to line items
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Clear preview
            </button>
          </>
        )}
      </div>

      {parseError && (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {parseError}
        </p>
      )}

      {preview && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2">Name on bill (file)</th>
                <th className="border-b border-gray-200 px-3 py-2">Batch</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Qty</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Unit price</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">MRP</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right">Tax %</th>
                <th className="border-b border-gray-200 px-3 py-2">Expiry</th>
                <th className="border-b border-gray-200 px-3 py-2 min-w-[14rem]">
                  Map to your medicine
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, idx) => {
                const sorted = medicinesSortedByMatch(medicineList, row.fileMedicineName);
                return (
                  <tr key={row.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/80"}>
                    <td className="border-b border-gray-100 px-3 py-2 font-medium text-gray-900">
                      {row.fileMedicineName || "—"}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-2 text-gray-700">{row.batch || "—"}</td>
                    <td className="border-b border-gray-100 px-3 py-2 text-right tabular-nums">
                      {row.qty || "—"}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-2 text-right tabular-nums">
                      {row.unitPrice != null ? row.unitPrice : "—"}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-2 text-right tabular-nums">
                      {row.mrp || "—"}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-2 text-right tabular-nums">
                      {row.tax != null ? row.tax : "—"}
                    </td>
                    <td className="border-b border-gray-100 px-3 py-2 text-gray-700">{row.expiry || "—"}</td>
                    <td className="border-b border-gray-100 px-2 py-1.5">
                      <select
                        disabled={disabled}
                        className="w-full max-w-md rounded-md border border-indigo-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={row.mappedMedicineId}
                        onChange={(e) => updateMappedId(idx, e.target.value)}
                        aria-label={`Map catalogue medicine for ${row.fileMedicineName}`}
                      >
                        <option value="">— Select medicine —</option>
                        {sorted.map((m) => (
                          <option key={String(m.medicineId ?? m.id)} value={String(m.medicineId ?? m.id)}>
                            {m.medicineName || m.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
