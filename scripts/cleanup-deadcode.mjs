#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const files = [
  // Unused facility CRUD table (replaced by GenericFacilityPage)
  "src/components/facilities/FacilityCrudTable.jsx",
  "src/components/facilities/FacilityCrudTable.module.scss",
  // Legacy per-type facility pages
  "src/pages/facilities/AuxiliaryLandsPage.jsx",
  "src/pages/facilities/BorderLandsPage.jsx",
  "src/pages/facilities/CowshedPage.jsx",
  "src/pages/facilities/FishPondsPage.jsx",
  "src/pages/facilities/FurFarmPage.jsx",
  "src/pages/facilities/GreenhousePage.jsx",
  "src/pages/facilities/PoultryPage.jsx",
  "src/pages/facilities/SheepfoldPage.jsx",
  "src/pages/facilities/WorkshopsPage.jsx",
  "src/pages/facilities/index.jsx",
  "src/pages/FacilitiesPage.jsx",
  // Static data/constants
  "src/constants/facilityTypes.js",
  "src/data/facilityTypes.js",
  "src/data/orgTree.js",
  // Unused map/dashboard components
  "src/components/map/FacilitiesLayer.jsx",
  "src/components/map/FacilityPopupCard.jsx",
  "src/components/map/MapDraw.jsx",
  "src/components/map/CinematicIntro.jsx",
  "src/components/map/FacilityDetailsModal.jsx",
  "src/components/dashboard/FacilityTypeChips.jsx",
  "src/components/org/OrgModals.jsx",
  // Stale APIs
  "src/api/facilityBase.js",
  "src/api/stats.js",
  // Unused layout shell
  "src/components/layout/AppShell.jsx",
];

async function rm(p) {
  try {
    await fs.unlink(p);
    return true;
  } catch (e) {
    if (e?.code === "ENOENT") return false;
    // retry with windows path normalization
    throw e;
  }
}

(async () => {
  let removed = 0;
  for (const rel of files) {
    const abs = path.join(root, rel);
    const ok = await rm(abs);
    if (ok) {
      removed++;
      console.log("Deleted:", rel);
    }
  }
  console.log(`\nCleanup done. Removed ${removed} file(s).`);
})().catch((e) => {
  console.error("Cleanup failed:", e.message || e);
  process.exit(1);
});
