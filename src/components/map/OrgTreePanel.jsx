// src/components/map/OrgTreePanel.jsx
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

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
}) {
  return (
    <div className={`org-tree-card ${hide ? "is-hidden" : ""}`}>
      <div className="org-tree-card__header">
        Tashkilot tuzilmasi
        <div className="org-tree-search-wrap">
          <input
            className="org-tree-search"
            type="text"
            placeholder="Qidirish..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClearSearch();
              if (e.key === "Enter") onEnterSearch();
            }}
          />
          {searchInput && (
            <button
              className="org-tree-search__clear"
              onClick={onClearSearch}
              aria-label="Qidiruvni tozalash"
            >
              ×
            </button>
          )}
        </div>
      </div>

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
            onCheck={(k) => onTreeCheck(k)}
            onSelect={(k) => onTreeSelect(k)}
            defaultExpandAll
            autoExpandParent
            virtual={false}
          />
        ) : (
          <div style={{ fontSize: 13, color: "#888" }}>
            Hech narsa topilmadi
          </div>
        )}
      </div>

      <div className="org-tree-card__hint">
        ✔ poligonlar turlarga ko‘ra ranglanadi · markazida ikon ko‘rinadi
        {bbox && <div style={{ marginTop: 4, opacity: 0.8 }}>BBOX: {bbox}</div>}
      </div>

      <div
        className="org-tree-card__body"
        style={{ borderTop: "1px solid var(--border,#e9ecf1)" }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Obyekt turlari</div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
        >
          {Object.keys(typeFilter).map((k) => (
            <label
              key={k}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <input
                type="checkbox"
                checked={typeFilter[k]}
                onChange={(e) =>
                  setTypeFilter((s) => ({ ...s, [k]: e.target.checked }))
                }
              />
              <span style={{ fontSize: 13 }}>{k}</span>
            </label>
          ))}
        </div>

        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            id="show-polys"
            type="checkbox"
            checked={showPolys}
            onChange={(e) => setShowPolys(e.target.checked)}
          />
          <label htmlFor="show-polys" style={{ fontSize: 13 }}>
            Show polygons
          </label>
        </div>

        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
          Bo‘limlar: {Array.isArray(checkedKeys) ? checkedKeys.length : 0} ta •
          Topildi: {facilitiesCount}
        </div>
      </div>
    </div>
  );
}
