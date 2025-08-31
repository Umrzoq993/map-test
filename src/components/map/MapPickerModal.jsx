import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import Modal from "../ui/Modal";
import MapTiles from "./MapTiles";

const DEFAULT_CENTER = [41.311081, 69.240562];
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
 *  open, onClose, onSave, value?, title?, dark? = "auto", size? = "xl", tms? = true
 */
export default function MapPickerModal({
  open,
  onClose,
  onSave,
  value,
  title = "Joylashuvni tanlang",
  dark = "auto", // ⬅️ default: auto
  size = "xl",
  tms = true,
}) {
  const [map, setMap] = useState(null);
  const [pos, setPos] = useState(null);
  // Local text inputs for manual entry to avoid jitter during typing
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");
  const initialZoom = value?.zoom ?? DEFAULT_ZOOM;

  const saveBtnRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPos(
        value?.lat != null && value?.lng != null ? [value.lat, value.lng] : null
      );
    }
  }, [open, value?.lat, value?.lng]);

  // Sync text inputs when pos changes externally (map click, initial open)
  useEffect(() => {
    if (pos) {
      setLatText(pos[0].toFixed(6));
      setLngText(pos[1].toFixed(6));
    } else if (open) {
      setLatText("");
      setLngText("");
    }
  }, [pos, open]);

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
      dark={dark} // ⬅️ modal ham auto’ga bo‘ysunadi
      initialFocusRef={saveBtnRef}
      zIndex={5000}
    >
      <div className="map-picker">
        <div className="controls">
          <div className="selected-pos">
            Tanlangan:&nbsp;
            <b>{pos ? `${pos[0].toFixed(6)}, ${pos[1].toFixed(6)}` : "—"}</b>
          </div>
          <div className="coord-row">
            <label className="coord-field">
              <span className="coord-label">Lat</span>
              <input
                type="number"
                step="0.000001"
                value={latText}
                onChange={(e) => {
                  const v = e.target.value;
                  setLatText(v);
                  const num = Number(v);
                  const lngNum = Number(lngText);
                  if (
                    !isNaN(num) &&
                    num >= -90 &&
                    num <= 90 &&
                    !isNaN(lngNum) &&
                    lngNum >= -180 &&
                    lngNum <= 180
                  ) {
                    setPos([num, lngNum]);
                    if (map)
                      map.flyTo([num, lngNum], map.getZoom(), {
                        duration: 0.4,
                      });
                  }
                }}
                placeholder="lat"
              />
            </label>
            <label className="coord-field">
              <span className="coord-label">Lng</span>
              <input
                type="number"
                step="0.000001"
                value={lngText}
                onChange={(e) => {
                  const v = e.target.value;
                  setLngText(v);
                  const num = Number(v);
                  const latNum = Number(latText);
                  if (
                    !isNaN(num) &&
                    num >= -180 &&
                    num <= 180 &&
                    !isNaN(latNum) &&
                    latNum >= -90 &&
                    latNum <= 90
                  ) {
                    setPos([latNum, num]);
                    if (map)
                      map.flyTo([latNum, num], map.getZoom(), {
                        duration: 0.4,
                      });
                  }
                }}
                placeholder="lng"
              />
            </label>
            <button className="btn locate-btn" onClick={locateMe}>
              Mening joylashuvim
            </button>
          </div>
        </div>

        <div
          className="map-holder"
          style={{ height: "60vh", borderRadius: 12, overflow: "hidden" }}
        >
          {open && (
            <MapContainer
              key={`${String(dark)}-${tms ? "tms" : "xyz"}`}
              center={center}
              zoom={initialZoom}
              whenCreated={setMap}
              style={{ height: "100%", width: "100%" }}
            >
              <MapTiles tms={tms} />
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
