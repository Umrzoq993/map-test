import MapDraw from "../components/MapDraw";
import orgTreeData from "../data/orgTree";

export default function MapPage({
  headerHeight = 60,
  dark,
  sidebarOpen = false,
}) {
  return (
    <div>
      <h1 style={{ margin: "0 0 12px" }}>Map</h1>
      <MapDraw
        height={`calc(100vh - ${headerHeight + 32 + 16}px)`}
        dark={dark}
        orgTree={orgTreeData}
        hideTree={sidebarOpen} // drawer ochiq paytda tree yashirinadi
      />
    </div>
  );
}
