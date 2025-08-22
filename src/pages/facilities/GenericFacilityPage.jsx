import { Navigate, useParams } from "react-router-dom";
import FacilityCrudTable from "../../components/facilities/FacilityCrudTable";
import { FACILITY_TYPES } from "../../data/facilityTypes";

const MAP = {
  greenhouse: ["GREENHOUSE", "Issiqxona"],
  poultry: ["POULTRY", "Tovuqxona"],
  cowshed: ["COWSHED", "Molxona"],
  sheepfold: ["SHEEPFOLD", "Qo‘yxona"],
  "fur-farm": ["FUR_FARM", "Kurkaxona"],
  fur: ["FUR_FARM", "Kurkaxona"],
  workshops: ["WORKSHOP", "Ustaxonalar"],
  workshop: ["WORKSHOP", "Ustaxonalar"],
  "aux-lands": ["AUX_LAND", "Yordamchi xo‘jalik yerlari"],
  aux: ["AUX_LAND", "Yordamchi xo‘jalik yerlari"],
  "border-lands": ["BORDER_LAND", "Chegara oldi yerlari"],
  border: ["BORDER_LAND", "Chegara oldi yerlari"],
  "fish-ponds": ["FISH_PONDS", "Baliq hovuzlari"],
  fish: ["FISH_PONDS", "Baliq hovuzlari"],
};

export default function GenericFacilityPage() {
  const { type } = useParams();
  const key = String(type || "").toLowerCase();
  const item = MAP[key];
  if (!item) return <Navigate to="/facilities/greenhouse" replace />;
  const [code, title] = item;
  if (!FACILITY_TYPES?.[code])
    return <Navigate to="/facilities/greenhouse" replace />;
  return <FacilityCrudTable type={code} title={title} />;
}
