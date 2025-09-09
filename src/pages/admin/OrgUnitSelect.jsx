import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuChevronDown, LuSearch, LuX } from "react-icons/lu";
import { getOrgUnit, searchOrgUnits } from "../../api/org";
import { debugError } from "../../utils/debug";
import styles from "./OrgUnitSelect.module.scss";

/** Qidiruvli org tanlash (dropdown) */
export default function OrgUnitSelect({
  value = null,
  onChange,
  placeholder = "Tashkilot birligini tanlang...",
  allowClear = true,
  disabled = false,
}) {
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null); // <— portal menyu

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState([]);
  const [selected, setSelected] = useState(null); // {id,name,code?,parentId?}

  const [pos, setPos] = useState({ left: 0, top: 0, width: 0, up: false });

  // value -> label
  useEffect(() => {
    let active = true;
    (async () => {
      if (!value) {
        setSelected(null);
        return;
      }
      try {
        const res = await getOrgUnit(value);
        if (active && res) {
          setSelected({
            id: res.id,
            name: res.name,
            code: res.code,
            parentId: res.parentId ?? null,
          });
        }
      } catch {
        if (active) setSelected(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [value]);

  // qidiruv (debounce)
  useEffect(() => {
    if (!open) return;
    const h = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchOrgUnits({
          q: query || undefined,
          page: 0,
          size: 10,
          sort: "name,asc",
        });
        const items = (res?.content || []).map((o) => ({
          id: o.id,
          name: o.name,
          code: o.code,
          parentId: o.parentId,
        }));
        setOpts(items);
      } catch (e) {
        debugError("Org search error", e);
        setOpts([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(h);
  }, [open, query]);

  const recompute = () => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const menuH = 320;
    const toBottom = window.innerHeight - (r.bottom + gap);
    const up = toBottom < 220 && r.top > 220;
    const top = up
      ? Math.max(8, r.top - gap - menuH)
      : Math.min(window.innerHeight - 8, r.bottom + gap);
    setPos({
      left: Math.max(8, r.left),
      top,
      width: Math.max(260, r.width),
      up,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    recompute();
    const onWin = () => recompute();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    const scroller = boxRef.current?.closest("[data-dialog-body]") || document;
    scroller.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
      scroller.removeEventListener("scroll", onWin, true);
    };
  }, [open]);

  // tashqi klik — lekin portal menyuni hisobga olamiz
  useEffect(() => {
    const onDocDown = (e) => {
      if (!open) return;
      const root = boxRef.current;
      const menu = menuRef.current;
      if (root && root.contains(e.target)) return;
      if (menu && menu.contains(e.target)) return; // <— menyu ichida: yopmaymiz
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown, true);
    return () => document.removeEventListener("mousedown", onDocDown, true);
  }, [open]);

  function choose(opt) {
    setSelected(opt);
    onChange?.(opt || null);
    setOpen(false);
  }

  function clear() {
    setSelected(null);
    onChange?.(null);
    setQuery("");
    inputRef.current?.focus();
  }

  const label = useMemo(() => {
    if (!selected) return "";
    return selected.code
      ? `${selected.name} (${selected.code})`
      : selected.name;
  }, [selected]);

  const MenuPortal =
    open &&
    createPortal(
      <div
        ref={menuRef}
        className={`${styles.menu} ${pos.up ? styles.up : ""}`}
        style={{ left: pos.left, top: pos.top, width: pos.width }}
        role="listbox"
        aria-label="Bo'linmalar"
      >
        {loading ? (
          <div className={styles.empty}>Yuklanmoqda...</div>
        ) : opts.length ? (
          opts.map((o) => (
            <div
              key={o.id}
              className={styles.item}
              onMouseDown={() => choose(o)} // <— mousedown: outside handler yopib yuborishidan oldin ishlaydi
              role="option"
              aria-selected={selected?.id === o.id}
            >
              <div className={styles.itemRow}>
                <div className={styles.itemName}>{o.name}</div>
                {o.code && <div className={styles.code}>#{o.code}</div>}
              </div>
              <div className={styles.itemMeta}>
                {o.parentId ? (
                  <span className={styles.parent}>parent: {o.parentId}</span>
                ) : (
                  <span className={styles.root}>ildiz</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>Hech narsa topilmadi</div>
        )}
      </div>,
      document.body
    );

  return (
    <>
      <div
        className={styles.wrap}
        ref={boxRef}
        data-disabled={disabled ? "" : undefined}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") setOpen(true);
        }}
      >
        <div className={styles.control}>
          <div
            className={styles.inputWrap}
            onClick={(e) => e.stopPropagation()}
          >
            <LuSearch className={styles.icon} />
            <input
              ref={inputRef}
              className={styles.input}
              placeholder={selected ? "" : placeholder}
              value={open ? query : label}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => !disabled && setOpen(true)}
              disabled={disabled}
            />
          </div>
          <div className={styles.actions}>
            {allowClear && selected && !disabled && (
              <button
                className={styles.iconBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                }}
                title="Tozalash"
                type="button"
              >
                <LuX />
              </button>
            )}
            <button
              className={styles.iconBtn}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((s) => !s);
                if (!open) setTimeout(recompute, 0);
              }}
              title={open ? "Yopish" : "Ochish"}
              type="button"
            >
              <LuChevronDown className={styles.chev} />
            </button>
          </div>
        </div>
      </div>

      {MenuPortal}
    </>
  );
}
