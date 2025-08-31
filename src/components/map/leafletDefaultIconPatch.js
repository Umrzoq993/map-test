// src/components/map/leafletDefaultIconPatch.js
// Vite/prod buildlarda Leaflet default marker rasmlarining yo'llarini to'g'ri o'rnatish
import L from "leaflet";
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";

// _getIconUrl ni ishlatmaymiz — to'g'ridan-to'g'ri mergeOptions qilamiz
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  // shadowUrl removed
});

export default L; // ixtiyoriy: import qilganda tree-shake bo'lmasin
