const DEFAULT_CORPORATE_ID = 900;
function parseCorporateIdParam(param) {
  const n = param ? Number(param) : DEFAULT_CORPORATE_ID;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CORPORATE_ID;
}
function corporateIdQueryString(corporateId) {
  return new URLSearchParams({ corporate_id: String(corporateId) }).toString();
}
export {
  DEFAULT_CORPORATE_ID,
  corporateIdQueryString,
  parseCorporateIdParam
};
