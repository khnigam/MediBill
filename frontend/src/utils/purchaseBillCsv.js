/**
 * Distributor bill CSV: parse rows and score catalogue matches (no external deps).
 */

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.replace(/^\s+|\s+$/g, "").replace(/^"|"$/g, ""));
}

export function parseCsvText(text) {
  const raw = String(text || "").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => c === "")) continue;
    rows.push(cells);
  }
  return { headers, rows };
}

const HEADER_KEYS = {
  medicine_name: [
    "medicine_name",
    "medicinename",
    "medicine name",
    "item",
    "item_name",
    "item name",
    "product",
    "product_name",
    "drug",
    "drug_name",
    "name",
    "description",
  ],
  batch: ["batch", "batch_no", "batchno", "lot", "lot_no", "batch number"],
  qty: ["qty", "quantity", "qnty", "pack", "units", "qty."],
  unit_price: [
    "unit_price",
    "unit price",
    "rate",
    "cost",
    "pur_rate",
    "purchase_rate",
    "purchase price",
    "net_rate",
  ],
  mrp: ["mrp", "max_retail", "max retail", "retail_price"],
  tax_percent: ["tax", "tax_percent", "tax%", "gst", "gst%"],
  expiry: ["expiry", "exp", "best_before", "bbd", "exp date"],
};

function normalizeHeader(h) {
  return String(h || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function headerToFieldIndex(headers) {
  const norm = headers.map((h) => normalizeHeader(h));
  const idx = {};
  const used = new Set();

  const pick = (aliases) => {
    for (let i = 0; i < norm.length; i++) {
      if (used.has(i)) continue;
      const n = norm[i].replace(/\s/g, "_");
      const n2 = norm[i];
      for (const a of aliases) {
        const a1 = a.replace(/\s/g, "_");
        if (n === a1 || n2 === a || norm[i] === a.replace(/_/g, " ")) {
          used.add(i);
          return i;
        }
      }
    }
    for (let i = 0; i < norm.length; i++) {
      if (used.has(i)) continue;
      for (const a of aliases) {
        if (norm[i].includes(a.replace(/_/g, " ")) || norm[i].includes(a)) {
          used.add(i);
          return i;
        }
      }
    }
    return -1;
  };

  for (const [key, aliases] of Object.entries(HEADER_KEYS)) {
    const i = pick(aliases);
    if (i >= 0) idx[key] = i;
  }
  return idx;
}

export function normalizeForMatch(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Higher = better match between bill line name and catalogue `medicineName`. */
export function scoreMedicineMatch(billName, medicineName) {
  const q = normalizeForMatch(billName);
  const c = normalizeForMatch(medicineName);
  if (!q || !c) return 0;
  if (q === c) return 10000;
  if (c === q) return 10000;
  if (c.includes(q) || q.includes(c)) return 5000 + Math.min(q.length, c.length) * 10;

  const qw = q.split(" ").filter((w) => w.length > 1);
  let score = 0;
  for (const w of qw) {
    if (c.includes(w)) score += 120 + w.length * 4;
  }
  const head = q.slice(0, 6);
  if (head.length >= 3 && c.includes(head)) score += 80;
  return score;
}

export function findBestMedicineMatch(billName, medicineList) {
  if (!medicineList?.length) return null;
  const q = String(billName || "").trim();
  if (!q) return null;
  let best = null;
  let bestScore = -1;
  for (const m of medicineList) {
    const name = m.medicineName || m.name || "";
    const s = scoreMedicineMatch(q, name);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  // No confident match — leave mapping empty so the user must choose.
  if (bestScore < 40) return null;
  return best;
}

function cell(row, fieldIndexMap, key, fallback = "") {
  const i = fieldIndexMap[key];
  if (i == null || i < 0 || i >= row.length) return fallback;
  return row[i] != null ? String(row[i]).trim() : fallback;
}

/**
 * @returns {{ previewRows: object[], error?: string }}
 */
export function parsePurchaseBillRows(csvText, medicineList) {
  const { headers, rows } = parseCsvText(csvText);
  if (!headers.length) return { previewRows: [], error: "CSV has no header row." };

  const map = headerToFieldIndex(headers);
  if (map.medicine_name == null) {
    return {
      previewRows: [],
      error:
        'Missing a medicine column. Use a header like "medicine_name", "item", or "product".',
    };
  }

  const previewRows = rows.map((row, rowIndex) => {
    const fileMedicineName = cell(row, map, "medicine_name", "");
    const batch = cell(row, map, "batch", "");
    const qty = cell(row, map, "qty", "");
    const unitPrice = parseFloat(cell(row, map, "unit_price", "0").replace(/,/g, "")) || 0;
    const mrp = cell(row, map, "mrp", "");
    const taxRaw = cell(row, map, "tax_percent", "");
    const tax = taxRaw === "" ? 5 : parseFloat(taxRaw.replace(/,/g, "")) || 5;
    const expiry = cell(row, map, "expiry", "");

    const best = findBestMedicineMatch(fileMedicineName, medicineList);
    const mappedMedicineId = best != null ? String(best.medicineId ?? best.id ?? "") : "";

    return {
      id: `csv-${rowIndex}`,
      fileMedicineName,
      batch,
      qty,
      unitPrice,
      mrp,
      tax,
      expiry,
      mappedMedicineId,
    };
  });

  return { previewRows };
}

/**
 * Maps AI/vision API line objects into the same preview row shape as {@link parsePurchaseBillRows}.
 * Keeps catalogue fuzzy-match behaviour identical to CSV import.
 *
 * @param {object[]} lines - objects with snake_case keys from the backend
 * @returns {{ previewRows: object[], error?: string }}
 */
export function previewRowsFromAiExtracted(lines, medicineList) {
  const arr = Array.isArray(lines) ? lines : [];
  if (!arr.length) {
    return { previewRows: [], error: "AI returned no line items. Try a clearer photo or PDF page." };
  }
  const previewRows = arr
    .map((row, rowIndex) => {
    const fileMedicineName = String(row.medicine_name ?? row.medicineName ?? "").trim();
    const batch = String(row.batch ?? "").trim();
    const qty = String(row.qty ?? row.quantity ?? "").trim();
    const unitPrice =
      parseFloat(String(row.unit_price ?? row.rate ?? "0").replace(/,/g, "")) || 0;
    const mrpRaw = row.mrp != null && row.mrp !== "" ? String(row.mrp).trim() : "";
    const taxRaw = String(row.tax_percent ?? row.tax ?? row.gst ?? "").trim();
    const tax = taxRaw === "" ? 5 : parseFloat(taxRaw.replace(/,/g, "")) || 5;
    const expiry = String(row.expiry ?? row.exp ?? "").trim();

    const best = findBestMedicineMatch(fileMedicineName, medicineList);
    const mappedMedicineId = best != null ? String(best.medicineId ?? best.id ?? "") : "";

      return {
        id: `ai-${rowIndex}`,
        fileMedicineName,
        batch,
        qty,
        unitPrice,
        mrp: mrpRaw,
        tax,
        expiry,
        mappedMedicineId,
      };
    })
    .filter((r) => r.fileMedicineName || r.batch || r.qty);

  if (!previewRows.length) {
    return {
      previewRows: [],
      error: "AI returned only empty rows. Try a sharper image or a single invoice page.",
    };
  }

  return { previewRows };
}

export function medicinesSortedByMatch(medicineList, fileMedicineName) {
  return [...(medicineList || [])].sort(
    (a, b) =>
      scoreMedicineMatch(fileMedicineName, b.medicineName || b.name || "") -
      scoreMedicineMatch(fileMedicineName, a.medicineName || a.name || "")
  );
}

/** Turn CSV preview rows into purchase table row objects (same shape as `emptyRowTemplate`). */
export function buildPurchaseRowsFromPreview(previewRows, medicineList, emptyRowTemplate) {
  return previewRows.map((pr) => {
    const med = medicineList.find(
      (m) => String(m.medicineId ?? m.id ?? "") === String(pr.mappedMedicineId)
    );
    if (!med) {
      return {
        ...emptyRowTemplate,
        medicineId: null,
        medicineName: pr.fileMedicineName,
        batch: pr.batch,
        qty: String(pr.qty ?? ""),
        unitPrice: Number(pr.unitPrice) || 0,
        mrp: pr.mrp != null && pr.mrp !== "" ? String(pr.mrp) : "",
        tax: Number(pr.tax) || 5,
        expiry: pr.expiry || "",
        apiTax: false,
      };
    }
    return {
      ...emptyRowTemplate,
      medicineId: med.medicineId ?? med.id ?? null,
      medicineName: med.medicineName || med.name || "",
      batch: pr.batch || "",
      qty: String(pr.qty ?? ""),
      unitPrice: Number(pr.unitPrice) || 0,
      mrp: pr.mrp != null && pr.mrp !== "" ? String(pr.mrp) : "",
      tax: Number(pr.tax) || Number(med.tax) || 5,
      expiry: pr.expiry || "",
      batchOptions: med.batches || [],
      apiTax: true,
    };
  });
}
