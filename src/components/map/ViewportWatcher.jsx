// src/components/map/ViewportWatcher.jsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function ViewportWatcher({ onBboxChange }) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof onBboxChange !== "function") return;

    const toBBox = (b) =>
      `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const update = () => onBboxChange(toBBox(map.getBounds()));

    // Xarita tayyor bo‘lgach bir marta update qilamiz va keyin moveend ni tinglaymiz
    map.whenReady(() => {
      update();
      map.on("moveend", update);
    });

    return () => {
      map.off("moveend", update);
    };
  }, [map, onBboxChange]);

  return null;
}
