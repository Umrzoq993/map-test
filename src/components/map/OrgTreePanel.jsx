//src/components/map/OrgTreePanel.jsx
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import "./OrgTreePanel.css";

/** Faqat ruxsat etilgan 11 yo‘nalish uchun o‘zbekcha yorliqlar (fallback) */
const DEFAULT_TYPE_LABELS = {
  GREENHOUSE: "Issiqxona",
  POULTRY_MEAT: "Tovuqxona (go‘sht)",
  POULTRY_EGG: "Tovuqxona (tuxum)",
  TURKEY: "Kurkaxona",
  COWSHED: "Molxona",
  SHEEPFOLD: "Qo‘yxona",
  WORKSHOP_SAUSAGE: "Ishlab chiqarish sexi (kolbasa)",
  WORKSHOP_COOKIE: "Ishlab chiqarish sexi (pechenye)",
  AUX_LAND: "Yordamchi xo‘jalik yeri",
  BORDER_LAND: "Chegara oldi yeri",
  FISHPOND: "Baliqchilik ko‘li",
};

/** UI’da ko‘rsatish tartibi */
const FRONT_ORDER = [
  "GREENHOUSE",
  "POULTRY_MEAT",
  "POULTRY_EGG",
  "TURKEY",
  "COWSHED",
  "SHEEPFOLD",
  "WORKSHOP_SAUSAGE",
  "WORKSHOP_COOKIE",
  "AUX_LAND",
  "BORDER_LAND",
  "FISHPOND",
];

/** BBOX’ni chiroyli ko‘rinishda chiqarish (ichkarida o‘raladi, overflow yo‘q) */
function BboxPretty({ bbox }) {
  const chip = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid var(--db-border, #e5e7eb)",
    background: "var(--db-card, #fff)",
    color: "var(--db-fg, #0f172a)",
    whiteSpace: "nowrap",
  };
  const wrap = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    lineHeight: 1.4,
  };
  const arrow = { opacity: 0.7 };

  const fmt = (v) =>
    Number.isFinite(Number(v)) ? Number(v).toFixed(5) : String(v ?? "—");

  let arr = Array.isArray(bbox) ? bbox : null;
  if (!arr && typeof bbox === "string") {
    arr = bbox
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map(Number);
  }
  if (!arr || arr.length !== 4) {
    return <span className="otp-muted">Ko‘rinish chegarasi: —</span>;
  }

  const [minLng, minLat, maxLng, maxLat] = arr;
  const swLon = fmt(minLng);
  const swLat = fmt(minLat);
  const neLon = fmt(maxLng);
  const neLat = fmt(maxLat);

  return (
    <div className="otp-bbox" style={wrap}>
      <span className="otp-muted">Ko‘rinish (BBOX):</span>
      <span
        className="otp-pill"
        style={chip}
        title={`Janubi-g‘arb: ${swLon}, ${swLat}`}
      >
        <strong>Janubi-g‘arb</strong>
        <span>
          ({swLon}, {swLat})
        </span>
      </span>
      <span className="otp-arrow" style={arrow}>
        →
      </span>
      <span
        className="otp-pill"
        style={chip}
        title={`Shimoli-sharq: ${neLon}, ${neLat}`}
      >
        <strong>Shimoli-sharq</strong>
        <span>
          ({neLon}, {neLat})
        </span>
      </span>
    </div>
  );
}

export default function OrgTreePanel({
  rcData,
  checkedKeys,
  selectedKeys,
  expandedKeys,
  onTreeExpand,
  onTreeCheck,
  onTreeSelect,
  searchInput,
  setSearchInput,
  onEnterSearch,
  onClearSearch,
  typeFilter,
  setTypeFilter,
  showPolys,
  setShowPolys,
  bbox,
  facilitiesCount,
  selectedOrgId,
  hide = false,
  typeLabels, // ✅ MapView’dan kelgan o‘zbekcha yorliqlar (ixtiyoriy)
  onRequestHide, // ✅ Panelni headerdan yopish uchun
}) {
  const LABELS = typeLabels || DEFAULT_TYPE_LABELS;

  const allKeys = Object.keys(typeFilter || {});
  const visibleKeys = FRONT_ORDER.filter((k) => allKeys.includes(k));
  const extraKeys = allKeys.filter((k) => !FRONT_ORDER.includes(k));

  const toggleType = (k, val) =>
    setTypeFilter((s) => ({ ...s, [k]: val ?? !s[k] }));

  const turnOnAll = () => {
    setTypeFilter((s) => {
      const next = { ...s };
      visibleKeys.forEach((k) => (next[k] = true));
      return next;
    });
  };
  const turnOffAll = () => {
    setTypeFilter((s) => {
      const next = { ...s };
      visibleKeys.forEach((k) => (next[k] = false));
      return next;
    });
  };

  return (
    <div className={`org-tree-card ${hide ? "is-hidden" : ""}`}>
      {/* Sarlavha + qidiruv */}
      <div className="org-tree-card__header">
        <span className="otp-title">Tashkilot tuzilmasi</span>

        <div className="org-tree-search-wrap">
          <input
            className="org-tree-search"
            type="text"
            placeholder="Tashkilot nomi bo‘yicha qidirish…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClearSearch();
              if (e.key === "Enter") onEnterSearch();
            }}
            aria-label="Qidirish"
          />
          {searchInput && (
            <button
              className="org-tree-search__clear"
              onClick={onClearSearch}
              aria-label="Qidiruvni tozalash"
              title="Tozalash"
            >
              ×
            </button>
          )}
        </div>

        {/* ✅ Headerdan panelni tezda yopish */}
        <button
          className="otp-btn"
          type="button"
          onClick={() => onRequestHide?.()}
          title="Panelni yashirish (T)"
          style={{ marginLeft: 6 }}
        >
          Yashirish
        </button>
      </div>

      {/* Daraxt */}
      <div className="org-tree-card__body">
        {rcData?.length ? (
          <Tree
            checkable
            selectable
            treeData={rcData}
            checkedKeys={checkedKeys}
            selectedKeys={selectedKeys}
            expandedKeys={expandedKeys}
            onExpand={onTreeExpand}
            onCheck={(k) => onTreeCheck(Array.isArray(k) ? k : k.checked)}
            onSelect={(k) => onTreeSelect(k)}
            defaultExpandAll
            autoExpandParent
            virtual={false}
          />
        ) : (
          <div className="otp-muted">Ma’lumot topilmadi</div>
        )}
      </div>

      {/* Izoh / holat */}
      <div className="org-tree-card__hint">
        <div className="otp-muted">
          ✔ Poligonlar turiga ko‘ra ranglanadi, markazida ikon ko‘rinadi.
        </div>
        <BboxPretty bbox={bbox} />
        <div className="otp-muted">
          Xaritadagi obyektlar: {facilitiesCount ?? 0} ta
        </div>
      </div>

      {/* Turlar filtri */}
      <div className="org-tree-card__body org-tree-card__body--border-top">
        <div className="otp-section-title">Obyekt turlari</div>

        <div className="otp-actions">
          <button type="button" className="otp-btn" onClick={turnOnAll}>
            Barchasini yoqish
          </button>
          <button
            type="button"
            className="otp-btn otp-btn--soft"
            onClick={turnOffAll}
          >
            Barchasini o‘chirish
          </button>
        </div>

        <div className="otp-grid">
          {visibleKeys.map((k) => (
            <label key={k} className="otp-check">
              <input
                type="checkbox"
                checked={!!typeFilter[k]}
                onChange={(e) => toggleType(k, e.target.checked)}
              />
              <span>{LABELS[k] || k}</span>
            </label>
          ))}

          {extraKeys.length > 0 &&
            extraKeys.map((k) => (
              <label key={`extra_${k}`} className="otp-check otp-check--dim">
                <input
                  type="checkbox"
                  checked={!!typeFilter[k]}
                  onChange={(e) => toggleType(k, e.target.checked)}
                />
                <span>{k}</span>
              </label>
            ))}
        </div>

        <div className="otp-toggle">
          <input
            id="show-polys"
            type="checkbox"
            checked={showPolys}
            onChange={(e) => setShowPolys(e.target.checked)}
          />
          <label htmlFor="show-polys">Poligonlarni ko‘rsatish</label>
        </div>

        <div className="otp-foot">
          Belgilangan bo‘limlar:{" "}
          {Array.isArray(checkedKeys) ? checkedKeys.length : 0} ta
          {selectedOrgId != null ? (
            <> • Tanlangan ID: {String(selectedOrgId)}</>
          ) : null}
        </div>
      </div>
    </div>
  );
}
