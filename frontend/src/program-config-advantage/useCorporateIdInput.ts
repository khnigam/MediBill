import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  corporateIdQueryString,
  DEFAULT_CORPORATE_ID,
  parseCorporateIdParam,
} from "./corporateIdSearchParam";

/**
 * Corporate id in the URL is authoritative for links/API, but the text field uses a local draft so
 * clearing or partially editing (e.g. changing 900) does not immediately snap back to the default.
 */
export function useCorporateIdInput() {
  const [searchParams, setSearchParams] = useSearchParams();
  const corporateId = useMemo(
    () => parseCorporateIdParam(searchParams.get("corporate_id")),
    [searchParams]
  );
  const [draft, setDraft] = useState(() => String(corporateId));

  useEffect(() => {
    setDraft(String(corporateId));
  }, [corporateId]);

  const commitDraftToUrl = useCallback(() => {
    const trimmed = draft.trim();
    const n = trimmed === "" ? NaN : Number(trimmed);
    const resolved =
      Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_CORPORATE_ID;
    const next = new URLSearchParams(searchParams);
    if (resolved === DEFAULT_CORPORATE_ID) next.delete("corporate_id");
    else next.set("corporate_id", String(resolved));
    setSearchParams(next, { replace: true });
    setDraft(String(resolved));
  }, [draft, searchParams, setSearchParams]);

  const q = corporateIdQueryString(corporateId);

  return { corporateId, draft, setDraft, commitDraftToUrl, q };
}
