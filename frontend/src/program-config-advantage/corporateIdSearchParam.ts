/** Rails default in your {@code nonomonetary_awards} action when param omitted. */
export const DEFAULT_CORPORATE_ID = 900;

export function parseCorporateIdParam(param: string | null): number {
  const n = param ? Number(param) : DEFAULT_CORPORATE_ID;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CORPORATE_ID;
}

/** Query string only, e.g. {@code corporate_id=42} (no leading {@code ?}). */
export function corporateIdQueryString(corporateId: number): string {
  return new URLSearchParams({ corporate_id: String(corporateId) }).toString();
}
