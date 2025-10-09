import { Navigate } from "react-router-dom";
import { useFacilityTypes } from "../../hooks/useFacilityTypes";

export default function FirstFacilityRedirect() {
  const { types, slugFor } = useFacilityTypes();
  const first = Array.isArray(types) && types.length ? types[0] : null;
  const slug = first ? slugFor(first.code) : "greenhouse";
  return <Navigate to={`/facilities/${slug}`} replace />;
}
