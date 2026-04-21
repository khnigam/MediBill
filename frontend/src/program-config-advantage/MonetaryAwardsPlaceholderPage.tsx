import React, { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { corporateIdQueryString, parseCorporateIdParam } from "./corporateIdSearchParam";

export default function MonetaryAwardsPlaceholderPage() {
  const [searchParams] = useSearchParams();
  const corporateId = useMemo(
    () => parseCorporateIdParam(searchParams.get("corporate_id")),
    [searchParams]
  );
  const q = corporateIdQueryString(corporateId);

  return (
    <div className="min-w-0 w-full max-w-2xl">
      <p className="mb-2 text-sm">
        <Link
          to={`/program-config?${q}`}
          className="font-medium text-gray-700 underline hover:text-gray-900"
        >
          ← Award type
        </Link>
      </p>
      <h1 className="text-2xl font-bold text-gray-900">Monetary awards</h1>
      <p className="mt-2 text-sm text-gray-500">Corporate ID: {corporateId}</p>
      <p className="mt-3 text-sm text-gray-600">
        This path is reserved for monetary appreciation configuration. Hook it to your Rails monetary endpoints when
        ready.
      </p>
    </div>
  );
}
