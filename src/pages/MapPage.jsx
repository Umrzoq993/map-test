import { useEffect, useState } from "react";
import MapView from "../components/map/MapView";
import { getOrgTree } from "../api/org";

export default function MapPage({ dark }) {
  const [orgTree, setOrgTree] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getOrgTree();
        setOrgTree(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setError(e.message || "Org tree loading error");
      }
    })();
  }, []);

  return (
    <div style={{ height: "100vh" }}>
      {error && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 9999,
            background: "#fff0f0",
            border: "1px solid #ffd6d6",
            color: "#b91c1c",
            padding: "8px 10px",
            borderRadius: 8,
          }}
        >
          API xato: {error}
        </div>
      )}
      <MapView orgTree={orgTree} dark={dark} />
    </div>
  );
}
