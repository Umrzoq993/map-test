// src/components/map/CodeJumpBox.jsx
import React, { useState, useMemo, useCallback } from "react";
import { getOrgByCode } from "../../api/org";

/**
 * Kichik suzuvchi input: org `code` bo'yicha topadi.
 * Muvaffaqiyatli bo'lsa:
 *  - onJump(org, pathIds, target) ni chaqiradi (target = {lat, lng, zoom})
 *  - inputni tozalaydi
 */
export default function CodeJumpBox({ orgTree, onJump }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const idToParent = useMemo(() => {
    const map = new Map();
    const walk = (node, parentId = null) => {
      if (!node) return;
      const id = node.key ?? node.id;
      if (id != null)
        map.set(String(id), parentId == null ? null : String(parentId));
      (node.children || []).forEach((ch) => walk(ch, id));
    };
    (orgTree || []).forEach((n) => walk(n, null));
    return map; // id -> parentId | null
  }, [orgTree]);

  const pathToRoot = useCallback(
    (id) => {
      const ids = [];
      let cur = id != null ? String(id) : null;
      let guard = 0;
      while (cur != null && guard < 1000) {
        ids.push(Number(cur)); // [self, parent, root]
        cur = idToParent.get(String(cur)) ?? null;
        guard++;
      }
      return ids;
    },
    [idToParent]
  );

  const handleKeyDown = async (e) => {
    if (e.key !== "Enter") return;
    const code = value.trim();
    if (!code) return;
    setBusy(true);
    setError("");
    try {
      const org = await getOrgByCode(code);
      if (!org) {
        setError("Topilmadi");
        setBusy(false);
        return;
      }
      const target = {
        lat: org.lat ?? 41.311081,
        lng: org.lng ?? 69.240562,
        zoom: org.zoom ?? 12,
      };
      const pathIds = pathToRoot(org.id); // self + filial + root
      onJump?.(org, pathIds, target);
      setValue("");
    } catch {
      setError("Kod bo‘yicha org topilmadi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="code-jump">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="Bo‘lim kodi..."
        title="Bo‘lim kodi"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
      />
      {error ? <div className="err">{error}</div> : null}
      <style>{`
        .code-jump {
          position: absolute;
          top: 12px;
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
        .code-jump input {
          width: 180px;
          height: 32px;
          border: 1px solid #d0d7de;
          border-radius: 6px;
          padding: 0 10px;
          outline: none;
        }
        .code-jump input:disabled { opacity: .6; }
        .code-jump .err { color: #b42318; font-size: 12px; }
        @media (prefers-color-scheme: dark) {
          .code-jump { background: rgba(28,28,30,0.9); }
          .code-jump input { background: #1c1c1e; color: #f2f2f7; border-color: #3a3a3c; }
          .code-jump .err { color: #ff453a; }
        }
      `}</style>
    </div>
  );
}
