import { useEffect, useState } from "react";
import MapDraw from "../components/MapDraw";
import { fetchOrgTree } from "../api/org";

export default function MapPage({
  headerHeight = 60,
  dark,
  sidebarOpen = false,
}) {
  const [orgTree, setOrgTree] = useState([]);

  useEffect(() => {
    fetchOrgTree().then(setOrgTree).catch(console.error);
  }, []);

  return (
    <div>
      <h1 style={{ margin: "0 0 12px" }}>Map</h1>
      <MapDraw
        height={`calc(100vh - ${headerHeight + 32 + 16}px)`}
        dark={dark}
        orgTree={orgTree}
        hideTree={sidebarOpen}
      />
    </div>
  );
}
