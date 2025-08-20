import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import Modal from "../ui/Modal";

// (ixtiyoriy) marker iconlari Vite’da to‘g‘ri ko‘rinsin desangiz, main.jsx da leaflet icon fix qo‘shing (pastda yozilgan)

const DEFAULT_CENTER = [41.311081, 69.240562]; // Toshkent
const DEFAULT_ZOOM = 12;

function ClickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function MapPickerModal({
  open,
  onClose,
  onSave, // ({lat,lng,zoom}) => void
  value, // { lat?, lng?, zoom? }
  title = "Joylashuvni tanlang",
}) {
  const [map, setMap] = useState(null);
  const [pos, setPos] = useState(null);
  const initialZoom = value?.zoom ?? DEFAULT_ZOOM;

  useEffect(() => {
    if (open) {
      setPos(value?.lat && value?.lng ? [value.lat, value.lng] : null);
    }
  }, [open, value]);

  const center = useMemo(() => {
    if (pos) return pos;
    if (value?.lat && value?.lng) return [value.lat, value.lng];
    return DEFAULT_CENTER;
  }, [pos, value]);

  const handleSave = () => {
    if (!pos) return;
    const zoom = map ? map.getZoom() : value?.zoom ?? DEFAULT_ZOOM;
    onSave({
      lat: Number(pos[0].toFixed(6)),
      lng: Number(pos[1].toFixed(6)),
      zoom,
    });
    onClose?.();
  };

  const locateMe = () => {
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((res) => {
      const p = [res.coords.latitude, res.coords.longitude];
      setPos(p);
      map.flyTo(p, 16, { duration: 0.8 });
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={title} width={900}>
      <div className="map-picker">
        <div className="controls">
          <div>
            Tanlangan:&nbsp;
            <b>{pos ? `${pos[0].toFixed(6)}, ${pos[1].toFixed(6)}` : "—"}</b>
          </div>
          <div className="spacer" />
          <button className="btn" onClick={locateMe}>
            Mening joylashuvim
          </button>
        </div>

        <div className="map-holder">
          {open && (
            <MapContainer
              center={center}
              zoom={initialZoom}
              whenCreated={setMap}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickCapture onPick={setPos} />
              {pos && <Marker position={pos} />}
            </MapContainer>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Bekor
          </button>
          <button className="btn primary" disabled={!pos} onClick={handleSave}>
            Tanlash
          </button>
        </div>
      </div>
    </Modal>
  );
}
