import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/** Past o‘ngda zoom darajasini ko‘rsatuvchi engil control */
export default function ZoomIndicator({ position = "bottomright" }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const ZoomCtrl = L.Control.extend({
      options: { position },
      onAdd() {
        const div = L.DomUtil.create("div", "leaflet-bar");
        div.style.padding = "0 8px";
        div.style.lineHeight = "28px";
        div.style.height = "28px";
        div.style.fontWeight = "600";
        div.style.userSelect = "none";
        const update = () => {
          div.textContent = `Zoom: ${map.getZoom()}`;
        };
        update();
        map.on("zoomend", update);
        return div;
      },
    });

    const ctrl = new ZoomCtrl();
    map.addControl(ctrl);
    return () => {
      map.removeControl(ctrl);
    };
  }, [map, position]);

  return null;
}
