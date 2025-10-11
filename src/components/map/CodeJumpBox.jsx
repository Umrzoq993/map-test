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
      try {
        // onJump ixtiyoriy va sinxron/asinxron bo'lishi mumkin
        const maybePromise = onJump?.(org, pathIds, target);
        if (maybePromise && typeof maybePromise.then === "function") {
          await maybePromise;
        }
      } finally {
        // Muvaffaqiyatli topilganda doimo tozalaymiz (onJump xatoga uchrasa ham)
        setValue("");
      }
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
        .code-jump input {
          width: 220px;
          height: 40px;
          border: 1px solid #d0d7de;
          border-radius: 6px;
          padding: 0 10px;
          outline: none;
          font-size: 16px;
          /* Light mode explicit colors */
          background: #ffffff;
          color: #0f172a;
          caret-color: #0f172a;
        }
        .code-jump input::placeholder { color: #64748b; }
        .code-jump input:disabled { opacity: .6; }
        .code-jump .err { color: #b42318; font-size: 12px; }
        /* App-level dark mode */
        html.dark .code-jump { background: rgba(28,28,30,0.9); }
        html.dark .code-jump input { background: #1c1c1e; color: #f2f2f7; border-color: #3a3a3c; }
        html.dark .code-jump .err { color: #ff453a; }
        /* Only honor OS dark scheme when app also set html.dark */
        @media (prefers-color-scheme: dark) {
          html.dark .code-jump { background: rgba(28,28,30,0.9); }
          html.dark .code-jump input { background: #1c1c1e; color: #f2f2f7; border-color: #3a3a3c; }
          html.dark .code-jump .err { color: #ff453a; }
        }
      `}</style>
    </div>
  );
}
