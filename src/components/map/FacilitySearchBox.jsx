// src/components/map/FacilitySearchBox.jsx
import React, { useEffect, useRef, useState } from "react";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { listFacilitiesPage } from "../../api/facilities";

/**
 * Floating search box to find facilities by name (inshoot nomi).
 * Props:
 *  - onJump: (facility) => void
 */
export default function FacilitySearchBox({ onJump }) {
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounced = useDebouncedValue(q, 350);
  const boxRef = useRef(null);

  // Search facilities by name
  useEffect(() => {
    const term = String(debounced || "").trim();
    setErr("");
    setHighlight(0);
    if (!term) {
      setItems([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    // busy flag removed to satisfy lint
    listFacilitiesPage({ q: term, page: 0, size: 10, sort: "name,asc" })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.content) ? res.content : [];
        setItems(list);
        setOpen(true);
      })
      .catch(() => {
        if (cancelled) return;
        setErr("Xatolik yoki ruxsat yo‘q");
        setItems([]);
        setOpen(false);
      })
      .finally(() => void 0);
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onSelect = (item) => {
    if (!item) return;
    onJump?.(item);
    setQ("");
    setItems([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) {
      if (e.key === "Enter") {
        // Trigger search immediately
        setQ((s) => s.trim());
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, items.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = items[highlight] || items[0];
      if (pick) onSelect(pick);
    }
  };

  return (
    <div ref={boxRef} className="fac-search">
      <input
        type="text"
        placeholder="Inshoot nomini qidirish..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        aria-label="Inshoot nomi bo‘yicha qidirish"
      />
      {err ? <div className="err">{err}</div> : null}
      {open && items.length > 0 && (
        <div className="dropdown" role="listbox">
          {items.map((it, idx) => (
            <button
              key={it.id}
              className={`row ${idx === highlight ? "hl" : ""}`}
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => onSelect(it)}
              role="option"
            >
              <span className="title">{it.name || "(nomlanmagan)"}</span>
              <span className="meta">
                {(it.type || "—").toString()}{" "}
                {it.orgName ? `· ${it.orgName}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
      <style>{`
        /* Match CodeJumpBox visual style */
        .fac-search {
          position: absolute;
          bottom: 50px;
          left: 12px;
          z-index: 1000;
          background: rgba(255,255,255,0.9);
          padding: 6px 8px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .fac-search input {
          width: 220px;
          height: 40px;
          border: 1px solid #d0d7de;
          border-radius: 6px;
          padding: 0 10px;
          outline: none;
          font-size: 16px;
          background: #fff;
        }
        .fac-search input:disabled { opacity: .6; }
        .fac-search input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .fac-search .err { color: #b42318; font-size: 12px; }
        .fac-search .dropdown {
          position: absolute;
          /* Open above the input */
          bottom: 50px;
          left: 8px;
          right: 8px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          box-shadow: 0 8px 20px rgba(0,0,0,.12);
          overflow: hidden;
          max-height: 320px;
          overflow-y: auto;
        }
        .fac-search .row {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          gap: 2px;
          padding: 8px 10px;
          background: #fff;
          border: none;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
        }
        .fac-search .row:last-child { border-bottom: none; }
        .fac-search .row.hl { background: #f8fafc; }
        .fac-search .title { font-weight: 600; font-size: 14px; }
        .fac-search .meta { color: #64748b; font-size: 12px; }
        /* App-level dark mode overrides */
        html.dark .fac-search { background: rgba(28,28,30,0.9); }
        html.dark .fac-search input { background: #1c1c1e; color: #f2f2f7; border-color: #3a3a3c; }
        html.dark .fac-search .dropdown { background: #101114; border-color: #2b2f36; }
        html.dark .fac-search .row { background: #101114; border-bottom-color: #1f232a; color: #e6eef9; }
        html.dark .fac-search .row.hl { background: #141821; }
        html.dark .fac-search .meta { color: #94a3b8; }
        /* Only honor OS dark scheme when app also set html.dark */
        @media (prefers-color-scheme: dark) {
          html.dark .fac-search { background: rgba(28,28,30,0.9); }
          html.dark .fac-search input { background: #1c1c1e; color: #f2f2f7; border-color: #3a3a3c; }
          html.dark .fac-search .dropdown { background: #101114; border-color: #2b2f36; }
          html.dark .fac-search .row { background: #101114; border-bottom-color: #1f232a; color: #e6eef9; }
          html.dark .fac-search .row.hl { background: #141821; }
          html.dark .fac-search .meta { color: #94a3b8; }
        }
      `}</style>
    </div>
  );
}
