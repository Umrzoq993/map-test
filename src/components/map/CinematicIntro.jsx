import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Yengil intro parvoz (low/medium/high), by default — "auto".
 * Intro tugaguncha interaksiyani muzlatadi va istasa tile’larni dim qiladi.
 * onStart/onDone — MapView’da og‘ir qatlamlarni kechiktirish uchun.
 */
export default function CinematicIntro({
  enabled = true,
  target, // { lat, lng, zoom }
  delayMs = 350,

  quality = "auto", // "auto" | "low" | "medium" | "high"
  drawPath = false, // faqat high’da ishlatiladi, default o‘chiq
  showOverlay = false, // default o‘chiq — eng yengil
  freezeInteractions = true,
  tilesDim = false, // default o‘chiq — eng yengil

  // davomiyliklar (ms)
  midDurationMs = 900,
  finalDurationMs = 900,

  // whenReady kutilsa ham fallback
  maxWaitReadyMs = 500,

  onStart,
  onDone,
}) {
  const map = useMap();

  const didRunRef = useRef(false);
  const overlayRef = useRef(null);
  const groupRef = useRef(null);
  const rafRef = useRef(null);
  const timersRef = useRef([]);
  const doneCalledRef = useRef(false);

  const isValid = (t) =>
    t &&
    Number.isFinite(t.lat) &&
    Number.isFinite(t.lng) &&
    Number.isFinite(t.zoom);

  const callDoneOnce = useCallback(() => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    try {
      onDone?.();
    } catch {}
  }, [onDone]);

  const clearTimer = (id) => {
    try {
      clearTimeout(id);
    } catch {}
  };

  const cleanup = useCallback(() => {
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimer);
      timersRef.current = [];
      try {
        groupRef.current?.remove();
      } catch {}
      groupRef.current = null;
      if (overlayRef.current) {
        try {
          overlayRef.current.remove();
        } catch {}
        overlayRef.current = null;
      }
      if (freezeInteractions) unfreeze();
      if (tilesDim) setTilesOpacity(1);
    } finally {
      callDoneOnce();
    }
  }, [freezeInteractions, tilesDim, unfreeze, callDoneOnce, setTilesOpacity]);

  const ensureGroup = useCallback(() => {
    if (!groupRef.current) groupRef.current = L.layerGroup().addTo(map);
    return groupRef.current;
  }, [map]);

  const addOverlay = useCallback(() => {
    if (!showOverlay) return;
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background:
        "radial-gradient(ellipse at center, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.42) 60%, rgba(0,0,0,0.52) 100%)",
      opacity: "0",
      transition: "opacity .35s ease",
      zIndex: 500,
    });
    map.getContainer().appendChild(el);
    requestAnimationFrame(() => (el.style.opacity = "1"));
    overlayRef.current = el;
  }, [showOverlay, map]);

  const fadeOutOverlay = useCallback(() => {
    if (!overlayRef.current) return;
    overlayRef.current.style.opacity = "0";
    timersRef.current.push(
      setTimeout(() => {
        try {
          overlayRef.current?.remove();
        } catch {}
        overlayRef.current = null;
      }, 350)
    );
  }, []);

  const setTilesOpacity = useCallback(
    (op) => {
      map.eachLayer((l) => {
        if (l instanceof L.TileLayer && typeof l.setOpacity === "function") {
          l.setOpacity(op);
        }
      });
    },
    [map]
  );

  const freeze = useCallback(() => {
    try {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.touchZoom.disable();
      map.keyboard.disable();
    } catch {}
  }, [map]);
  const unfreeze = useCallback(() => {
    try {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.touchZoom.enable();
      map.keyboard.enable();
    } catch {}
  }, [map]);

  const autoQuality = useCallback(() => {
    if (quality !== "auto") return quality;
    // Reduce Motion → low
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return "low";
    }
    const dm = navigator.deviceMemory || 4;
    const hc = navigator.hardwareConcurrency || 4;
    const pr = window.devicePixelRatio || 1;
    // Kuchsiz / yuqori dpi bo‘lsa — low; aks holda medium
    if (dm <= 4 || hc <= 4 || pr > 2.5) return "low";
    return "medium";
  }, [quality]);

  const animateDot = useCallback(
    (polyline, duration = 800) => {
      if (!polyline) return;
      const group = ensureGroup();
      const path = polyline.getLatLngs();
      if (!path?.length) return;
      const dot = L.circleMarker(path[0], {
        radius: 3.5,
        color: "#60A5FA",
        weight: 2,
        fillColor: "#fff",
        fillOpacity: 0.9,
      }).addTo(group);

      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const idx = Math.floor(p * (path.length - 1));
        dot.setLatLng(path[idx]);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
        else
          timersRef.current.push(
            setTimeout(() => {
              try {
                dot.remove();
              } catch {}
            }, 120)
          );
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [ensureGroup]
  );

  const ripple = useCallback(
    (latlng) => {
      const group = ensureGroup();
      const c = L.circle(latlng, {
        radius: 40,
        color: "#4F46E5",
        weight: 2,
        fillColor: "#6366F1",
        fillOpacity: 0.22,
      }).addTo(group);
      const t0 = performance.now();
      const dur = 600;
      const grow = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        c.setRadius(40 + p * 600);
        c.setStyle({ opacity: 1 - p, fillOpacity: 0.22 * (1 - p) });
        if (p < 1) rafRef.current = requestAnimationFrame(grow);
      };
      rafRef.current = requestAnimationFrame(grow);
      timersRef.current.push(
        setTimeout(() => {
          try {
            c.remove();
          } catch {}
        }, dur + 50)
      );
    },
    [ensureGroup]
  );

  // NOTE: Yon funksiyalar (freeze, unfreeze, fadeOutOverlay va h.k.) komponent scope ichida yaratiladi.
  // Animatsiya faqat bir marta ishlaydi — deps to'liq ro'yxatini qo'shgan holda ham rerun guard (didRunRef) buni to'xtatadi.
  useEffect(() => {
    if (!enabled || didRunRef.current) return;
    if (!isValid(target)) return;

    let cancelled = false;
    const mode = autoQuality(); // low / medium / high

    const start = () => {
      if (cancelled) return;
      didRunRef.current = true;
      try {
        onStart?.();
      } catch {}

      if (freezeInteractions) freeze();
      if (tilesDim) setTilesOpacity(0.6);
      if (showOverlay && mode !== "low") addOverlay();

      const midZoom = Math.max(5, Math.min(target.zoom - 4, 8));

      // LOW — faqat yakuniy qisqa flyTo (yoki reduce motion bo‘lsa setView)
      if (mode === "low") {
        const tid = setTimeout(() => {
          try {
            const reduce =
              typeof window !== "undefined" &&
              window.matchMedia &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (reduce) map.setView([target.lat, target.lng], target.zoom);
            else
              map.flyTo([target.lat, target.lng], target.zoom, {
                duration: Math.max(0.7, finalDurationMs / 1200),
                easeLinearity: 0.25,
              });
          } finally {
            timersRef.current.push(
              setTimeout(() => {
                fadeOutOverlay();
                if (tilesDim) setTilesOpacity(1);
                if (freezeInteractions) unfreeze();
                cleanup();
              }, 600)
            );
          }
        }, Math.max(0, delayMs));
        timersRef.current.push(tid);
        return;
      }

      // MEDIUM/HIGH — 2 bosqich
      const midTid = setTimeout(() => {
        try {
          map.flyTo([target.lat, target.lng], midZoom, {
            duration: Math.max(0.6, midDurationMs / 1000),
            easeLinearity: 0.25,
          });
        } catch {
          map.setView([target.lat, target.lng], midZoom);
        }
      }, Math.max(0, delayMs));
      timersRef.current.push(midTid);

      // HIGH — yo‘l chizish (yengil)
      let poly = null;
      if (mode === "high" && drawPath) {
        const from = map.getCenter();
        const steps = 60;
        const pts = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          pts.push([
            from.lat + (target.lat - from.lat) * t,
            from.lng + (target.lng - from.lng) * t,
          ]);
        }
        poly = L.polyline(pts, {
          color: "#93C5FD",
          weight: 2,
          dashArray: "6 6",
          opacity: 0.85,
        }).addTo(ensureGroup());
        animateDot(poly, 900);
      }

      const runFinal = () => {
        try {
          map.flyTo([target.lat, target.lng], target.zoom, {
            duration: Math.max(0.7, finalDurationMs / 1000),
            easeLinearity: 0.2,
          });
        } catch {
          map.setView([target.lat, target.lng], target.zoom);
        }

        const onEnd = () => {
          map.off("moveend", onEnd);
          if (mode === "high") ripple([target.lat, target.lng]);
          if (poly)
            try {
              poly.remove();
            } catch {}
          fadeOutOverlay();
          timersRef.current.push(
            setTimeout(() => {
              if (tilesDim) setTilesOpacity(1);
              if (freezeInteractions) unfreeze();
              cleanup();
            }, 600)
          );
        };
        map.once("moveend", onEnd);
        // moveend kelmasa ham
        timersRef.current.push(
          setTimeout(onEnd, Math.max(1100, finalDurationMs + 250))
        );
      };

      const onMidEnd = () => {
        map.off("moveend", onMidEnd);
        runFinal();
      };
      map.on("moveend", onMidEnd);
      timersRef.current.push(
        setTimeout(runFinal, delayMs + midDurationMs + 220)
      );
    };

    const readyFallback = setTimeout(start, maxWaitReadyMs);
    map.whenReady(start);
    timersRef.current.push(readyFallback);

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [
    enabled,
    target,
    delayMs,
    quality,
    drawPath,
    showOverlay,
    freezeInteractions,
    tilesDim,
    midDurationMs,
    finalDurationMs,
    maxWaitReadyMs,
    onStart,
    onDone,
    map,
    autoQuality,
    addOverlay,
    animateDot,
    cleanup,
    ensureGroup,
    fadeOutOverlay,
    freeze,
    ripple,
    setTilesOpacity,
    unfreeze,
  ]);

  return null;
}
