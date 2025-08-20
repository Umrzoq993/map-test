// src/components/map/MapPickerModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import Modal from "../ui/Modal";
import MapTiles from "./MapTiles";

// (Vite-da default Leaflet marker ikonlarini tuzatish uchun main.jsx da fix qo'ygan bo'lsangiz a'lo)
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

/**
 * Props:
 *  open: boolean
 *  onClose: () => void
 *  onSave: ({lat,lng,zoom}) => void
 *  value?: { lat?: number, lng?: number, zoom?: number }
 *  title?: string
 *  dark?: boolean // App'dan uzating (body/theme holatiga mos)
 *  size?: "sm" | "md" | "lg" | "xl" | "full"  // ixtiyoriy, default "xl"
 */
export default function MapPickerModal({
  open,
  onClose,
  onSave,
  value,
  title = "Joylashuvni tanlang",
  dark = false,
  size = "xl",
}) {
  const [map, setMap] = useState(null);
  const [pos, setPos] = useState(null);
  const initialZoom = value?.zoom ?? DEFAULT_ZOOM;

  const saveBtnRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPos(
        value?.lat != null && value?.lng != null ? [value.lat, value.lng] : null
      );
    }
  }, [open, value?.lat, value?.lng]);

  const center = useMemo(() => {
    if (pos) return pos;
    if (value?.lat != null && value?.lng != null) return [value.lat, value.lng];
    return DEFAULT_CENTER;
  }, [pos, value?.lat, value?.lng]);

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
    navigator.geolocation.getCurrentPosition(
      (res) => {
        const p = [res.coords.latitude, res.coords.longitude];
        setPos(p);
        map.flyTo(p, 16, { duration: 0.8 });
      },
      (err) => {
        console.warn("Geolocation error", err);
        alert("Geolokatsiya ruxsati berilmadi yoki xatolik yuz berdi.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      width={size === "full" ? "min(96vw,1200px)" : undefined}
      // Modal o'zi ham dark-aware, lekin xohlasangiz local majburlash:
      dark={dark}
      initialFocusRef={saveBtnRef}
    >
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
          {/* MapContainer'ni modal ochilganda render qilamiz */}
          {open && (
            <MapContainer
              key={dark ? "picker-dark" : "picker-light"} // tile almashganda remount bo‘lsin
              center={center}
              zoom={initialZoom}
              whenCreated={setMap}
              style={{ height: "100%", width: "100%" }}
            >
              <MapTiles dark={dark} />
              <ClickCapture onPick={setPos} />
              {pos && <Marker position={pos} />}
            </MapContainer>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Bekor
          </button>
          <button
            ref={saveBtnRef}
            className="btn primary"
            disabled={!pos}
            onClick={handleSave}
          >
            Tanlash
          </button>
        </div>
      </div>
    </Modal>
  );
}
