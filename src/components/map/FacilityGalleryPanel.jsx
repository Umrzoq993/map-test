import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./FacilityGalleryPanel.module.scss";
import {
  listFacilityImages,
  uploadFacilityImage,
  deleteFacilityImage,
  buildImageSrc,
} from "../../api/facilityImages";
import { toast } from "react-toastify";
import { debugError } from "../../utils/debug";

export default function FacilityGalleryPanel({
  open,
  facility,
  onClose,
  dark,
}) {
  const [images, setImages] = useState([]); // persisted (server) + temp items
  const [loading, setLoading] = useState(false);
  const [uploadingIds, setUploadingIds] = useState(new Set());
  const [progressMap, setProgressMap] = useState({}); // id -> 0..1
  const [failedMap, setFailedMap] = useState(new Set());
  const [panelWidth, setPanelWidth] = useState(null); // dynamic width px
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(60); // default header height
  const inputRef = useRef(null);
  const [isDark, setIsDark] = useState(!!dark);

  // Fetch on open/facility change
  useEffect(() => {
    let canceled = false;
    if (!open || !facility?.id) return;
    setLoading(true);
    (async () => {
      try {
        const list = await listFacilityImages(facility.id);
        if (!canceled) setImages(list);
      } catch (e) {
        if (!canceled) debugError("listFacilityImages failed", e);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [open, facility?.id]);

  useEffect(() => {
    if (dark != null) {
      setIsDark(!!dark);
      return;
    }
    const root = document.documentElement;
    const compute = () => setIsDark(root.classList.contains("dark"));
    compute();
    const obs = new MutationObserver(compute);
    obs.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => obs.disconnect();
  }, [dark]);

  const canUpload = !!facility?.id;

  const processFiles = useCallback(
    async (filesArr) => {
      const files = Array.from(filesArr || []);
      if (!files.length) return;
      const MAX = 5 * 1024 * 1024; // 5MB
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast.warn(`${file.name}: Tasvir emas (image/*)`);
          continue;
        }
        if (file.size > MAX) {
          toast.warn(`${file.name}: >5MB`);
          continue;
        }
        const tempId = `tmp-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
        const objUrl = URL.createObjectURL(file);
        setImages((prev) => [
          {
            id: tempId,
            url: objUrl,
            originalName: file.name,
            sizeBytes: file.size,
            contentType: file.type,
            createdAt: new Date().toISOString(),
            __temp: true,
          },
          ...prev,
        ]);
        setUploadingIds((s) => new Set([...s, tempId]));
        setProgressMap((pm) => ({ ...pm, [tempId]: 0 }));
        try {
          const dto = await uploadFacilityImage(facility.id, file, {
            onProgress: (p) =>
              setProgressMap((pm) => ({ ...pm, [tempId]: p || 0 })),
          });
          setImages((prev) =>
            prev.map((img) => (img.id === tempId ? dto : img))
          );
        } catch (err) {
          debugError("uploadFacilityImage failed", err);
          setImages((prev) => prev.filter((img) => img.id !== tempId));
          const st = err?.response?.status;
          if (st === 400) toast.error("Noto'g'ri rasm (400)");
          else if (st === 403) toast.error("Ruxsat yo'q (403)");
          else if (st === 404) toast.error("Obyekt topilmadi (404)");
          else if (st === 410) toast.error("Eskirgan endpoint (410)");
          else toast.error("Yuklashda xatolik");
          setFailedMap((fm) => new Set([...fm, tempId]));
        } finally {
          setUploadingIds((s) => {
            const n = new Set(s);
            n.delete(tempId);
            return n;
          });
          setProgressMap((pm) => {
            const { [tempId]: _, ...rest } = pm;
            return rest;
          });
        }
      }
    },
    [facility?.id]
  );

  const onPickFiles = async (e) => {
    await processFiles(e.target.files);
    e.target.value = ""; // reset
  };

  // Drag & drop
  const dropRef = useRef(null);
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = (e) => {
      prevent(e);
      if (!canUpload) return;
      processFiles(e.dataTransfer.files);
    };
    ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) =>
      el.addEventListener(ev, prevent)
    );
    el.addEventListener("drop", onDrop);
    return () => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) =>
        el.removeEventListener(ev, prevent)
      );
      el.removeEventListener("drop", onDrop);
    };
  }, [processFiles, canUpload]);

  const onDelete = useCallback(
    async (img) => {
      if (!facility?.id || !img?.id) return;
      const ok = window.confirm("Rasmni o'chirishni tasdiqlaysizmi?");
      if (!ok) return;
      // Optimistic remove
      setImages((prev) => prev.filter((x) => x.id !== img.id));
      try {
        if (!img.__temp) await deleteFacilityImage(facility.id, img.id);
      } catch {
        toast.error("O'chirishda xatolik");
        // rollback
        setImages((prev) => [...prev, img]);
      }
    },
    [facility?.id]
  );

  const imagesWithSrc = useMemo(
    () =>
      images
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((img) => ({
          ...img,
          __src: img.__temp ? img.url : buildImageSrc(img.url) + `?v=${img.id}`,
        })),
    [images]
  );

  const fmtSize = (n) => {
    if (!Number.isFinite(n)) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  };

  // Toggle global class for layout adjustments (map controls offset)
  useEffect(() => {
    if (open) document.documentElement.classList.add("gallery-open");
    return () => document.documentElement.classList.remove("gallery-open");
  }, [open]);

  // Apply dynamic width var
  useEffect(() => {
    if (open && panelWidth) {
      document.documentElement.style.setProperty(
        "--gallery-width",
        panelWidth + "px"
      );
    } else if (!open) {
      document.documentElement.style.removeProperty("--gallery-width");
    }
  }, [panelWidth, open]);

  // Resizer handlers
  const dragStateRef = useRef(null);
  const onResizerMouseDown = (e) => {
    if (e.button !== 0) return;
    const root = e.currentTarget?.closest?.(`.${styles.panelRoot}`);
    const startWidth = panelWidth || root?.offsetWidth || 420;
    dragStateRef.current = { startX: e.clientX, startWidth };
    window.addEventListener("mousemove", onResizerMove);
    window.addEventListener("mouseup", onResizerUp, { once: true });
    e.preventDefault();
  };
  const onResizerMove = (e) => {
    const st = dragStateRef.current;
    if (!st) return;
    const dx = st.startX - e.clientX; // drag left -> wider
    const w = Math.min(Math.max(st.startWidth + dx, 300), 800);
    setPanelWidth(w);
  };
  const onResizerUp = () => {
    dragStateRef.current = null;
    window.removeEventListener("mousemove", onResizerMove);
  };

  // Measure header height so panel matches only map visible region
  useEffect(() => {
    if (!open) return; // measure only when needed
    const measure = () => {
      const headerEl = document.querySelector("header");
      if (headerEl) {
        const h = headerEl.getBoundingClientRect().height;
        if (h && Math.abs(h - headerHeight) > 0.5) setHeaderHeight(h);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, headerHeight]);

  // After all hooks declared; safe conditional render
  if (!open) return null;

  return (
    <div
      className={styles.panelRoot}
      data-dark={isDark || undefined}
      ref={dropRef}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose?.();
        if (e.key === "ArrowRight" && lightboxIdx != null)
          setLightboxIdx((i) => (i + 1) % imagesWithSrc.length);
        if (e.key === "ArrowLeft" && lightboxIdx != null)
          setLightboxIdx(
            (i) => (i - 1 + imagesWithSrc.length) % imagesWithSrc.length
          );
      }}
      style={{
        ...(panelWidth ? { width: panelWidth } : null),
        top: headerHeight,
        height: `calc(100vh - ${headerHeight}px)`,
      }}
    >
      <div className={styles.resizer} onMouseDown={onResizerMouseDown} />
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.title}>
            {facility?.name || "Obyekt rasmlari"}
          </div>
          <div className={styles.subtitle}>
            {facility?.type} • ID: {facility?.id}
          </div>
        </div>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Yopish"
        >
          ×
        </button>
      </div>
      {loading && <div className={styles.loadingBar} />}
      <div className={styles.body}>
        <div className={styles.toolbar}>
          <label className={styles.uploadLabel} aria-disabled={!canUpload}>
            📤 Yuklash
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={!canUpload}
              onChange={onPickFiles}
            />
          </label>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Maks: 5MB • JPG/PNG/WebP
          </div>
        </div>
        <div className={styles.grid}>
          {imagesWithSrc.length === 0 && !loading && (
            <div className={styles.empty}>Hozircha rasm yo'q. Yuklang.</div>
          )}
          {imagesWithSrc.map((img, idx) => {
            const uploading = uploadingIds.has(img.id);
            const prog = progressMap[img.id];
            const isError = failedMap.has(img.id);
            return (
              <div
                key={img.id}
                className={styles.card}
                onClick={() => setLightboxIdx(idx)}
              >
                <div className={styles.thumbWrap}>
                  {uploading && (
                    <span className={styles.progressBadge} title="Yuklanmoqda">
                      {prog != null ? Math.round(prog * 100) + "%" : "UP"}
                    </span>
                  )}
                  {isError && (
                    <span
                      className={styles.errorBadge}
                      title="Yuklashda xatolik. Qayta urinib ko'ring?"
                      onClick={(e) => {
                        e.stopPropagation();
                        // re-pick original? we only have blob URL for temp; skip
                      }}
                    >
                      ERR
                    </span>
                  )}
                  <img
                    className={styles.thumb}
                    src={img.__src}
                    alt={img.originalName || `Image ${idx + 1}`}
                    loading="lazy"
                  />
                  <button
                    className={styles.deleteBtn}
                    title="O'chirish"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(img);
                    }}
                  >
                    🗑
                  </button>
                </div>
                <div className={styles.meta}>
                  <div className={styles.name} title={img.originalName}>
                    {img.originalName || `Image ${idx + 1}`}
                  </div>
                  <div className={styles.size}>{fmtSize(img.sizeBytes)}</div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Footer hint removed as per request */}
      </div>
      {lightboxIdx != null && imagesWithSrc[lightboxIdx] && (
        <Lightbox
          images={imagesWithSrc}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNavigate={(i) => setLightboxIdx(i)}
        />
      )}
    </div>
  );
}

function Lightbox({ images, index, onClose, onNavigate }) {
  const escHandler = useCallback(
    (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") onNavigate?.((index + 1) % images.length);
      if (e.key === "ArrowLeft")
        onNavigate?.((index - 1 + images.length) % images.length);
    },
    [index, images.length, onClose, onNavigate]
  );
  useEffect(() => {
    window.addEventListener("keydown", escHandler);
    return () => window.removeEventListener("keydown", escHandler);
  }, [escHandler]);

  const img = images[index];
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const fsRef = useRef(null);
  const [isFs, setIsFs] = useState(false);
  const [hideCursor, setHideCursor] = useState(false);

  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        fsRef.current?.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Auto-hide cursor on inactivity in fullscreen
  useEffect(() => {
    if (!isFs) {
      setHideCursor(false);
      return;
    }
    const el = fsRef.current || document.documentElement;
    let tid = null;
    const arm = () => {
      if (tid) clearTimeout(tid);
      tid = setTimeout(() => setHideCursor(true), 2000);
    };
    const onMove = () => {
      setHideCursor(false);
      arm();
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mousedown", onMove);
    arm();
    return () => {
      if (tid) clearTimeout(tid);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mousedown", onMove);
    };
  }, [isFs]);

  if (!img) return null;

  const uploadedAt = (() => {
    try {
      const d = new Date(img.createdAt);
      return isNaN(d) ? "" : d.toLocaleString();
    } catch {
      return "";
    }
  })();

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    setZoom((z) => Math.min(8, Math.max(0.2, +(z + delta).toFixed(2))));
  };
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, base: offset };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp, { once: true });
  };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    const { startX, startY, base } = dragRef.current;
    setOffset({
      x: base.x + (e.clientX - startX),
      y: base.y + (e.clientY - startY),
    });
  };
  const onMouseUp = () => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onMouseMove);
  };
  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className={styles.lightbox}
      ref={fsRef}
      data-fullscreen={isFs || undefined}
      data-hide-cursor={hideCursor || undefined}
      onClick={onClose}
    >
      <div className={styles.lightboxTop} onClick={(e) => e.stopPropagation()}>
        <div className={styles.lightboxTopLeft}>
          <div className={styles.lightboxTitle}>
            {img.originalName || `Image ${index + 1}`}
          </div>
          {uploadedAt && <div className={styles.lightboxSub}>{uploadedAt}</div>}
        </div>
      </div>
      <div
        className={styles.lightboxImgWrap}
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        style={{ cursor: zoom !== 1 ? "grab" : "default" }}
      >
        <img
          className={styles.lightboxImg}
          src={img.__src}
          alt={img.originalName || `Image ${index + 1}`}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transition: dragRef.current ? "none" : "transform .08s",
            cursor: dragRef.current
              ? "grabbing"
              : zoom !== 1
              ? "grab"
              : "default",
          }}
        />
      </div>
      <div
        className={styles.lightboxBottom}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={styles.navBtn}
            onClick={() =>
              onNavigate((index - 1 + images.length) % images.length)
            }
            aria-label="Oldingi"
          >
            ‹
          </button>
          <button
            className={styles.navBtn}
            onClick={() => onNavigate((index + 1) % images.length)}
            aria-label="Keyingi"
          >
            ›
          </button>
          <button
            className={styles.navBtn}
            onClick={resetView}
            aria-label="Reset"
            title="Zoom va pozitsiyani tiklash"
          >
            ⟳
          </button>
          <button
            className={styles.navBtn}
            onClick={toggleFullscreen}
            aria-label={isFs ? "Butun ekran rejimidan chiqish" : "Butun ekran"}
            title={isFs ? "Butun ekrandan chiqish" : "Butun ekranda ko‘rsatish"}
          >
            {isFs ? "⤢" : "⛶"}
          </button>
          <button
            className={styles.navBtn}
            onClick={onClose}
            aria-label="Yopish"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
